<?php

namespace App\Modules\Feed\Listeners;

use App\Models\FriendlyMatchParticipant;
use App\Models\Post;
use App\Modules\Feed\Services\FeedService;
use App\Modules\FriendlyMatch\Events\FriendlyMatchCompleted;
use Illuminate\Support\Facades\Log;

/**
 * Port Emergent d5ac086 [server.py:4899-4925] — post auto "Félicitations !"
 * quand un match amical est validé par les 2 capitaines.
 *
 * Auteur = captain de l'équipe gagnante (contrat Emergent : "author_id =
 * winner_ids[0]"). `post_match_info` contient score, gagnants, perdants,
 * club pour rendu UI détaillé.
 *
 * Aspect square (rendu carré Emergent). image_url initialement null —
 * l'endpoint /friendly-matches/{id}/result-photo pourra le backfill.
 */
class CreateSystemPostOnFriendlyMatchValidated
{
    public function __construct(private readonly FeedService $feed) {}

    public function handle(FriendlyMatchCompleted $event): void
    {
        $match = $event->match;

        if ($match->status !== 'completed' || ! $match->winner_team) {
            return;
        }

        $winnerTeam = (int) $match->winner_team;
        $loserTeam = $winnerTeam === 1 ? 2 : 1;

        $participants = FriendlyMatchParticipant::with('user')
            ->where('friendly_match_id', $match->id)
            ->orderBy('team')
            ->orderBy('slot')
            ->get();

        $winners = $participants->where('team', $winnerTeam)->values();
        $losers = $participants->where('team', $loserTeam)->values();

        $winnerCaptain = $winners->firstWhere('is_captain', true)?->user
            ?? $winners->first()?->user;

        if (! $winnerCaptain) {
            Log::warning('[Feed] FriendlyMatchCompleted sans captain gagnant — skip', [
                'match_id' => $match->id,
            ]);
            return;
        }

        $winnerNames = $this->formatPair($winners);
        $loserNames = $this->formatPair($losers);
        $score = "{$match->team1_games}-{$match->team2_games}";

        $text = "Félicitations ! {$winnerNames} remportent le match {$score} contre {$loserNames}";

        $metadata = [
            'post_match_info' => [
                'friendly_match_id' => $match->id,
                'winner_team' => $winnerTeam,
                'score' => $score,
                'tiebreak' => $match->tiebreak_team1 !== null || $match->tiebreak_team2 !== null
                    ? ['team1' => $match->tiebreak_team1, 'team2' => $match->tiebreak_team2]
                    : null,
                'winners' => $winners->map(fn ($p) => [
                    'uuid' => $p->user?->uuid,
                    'name' => $p->user?->name,
                ])->all(),
                'losers' => $losers->map(fn ($p) => [
                    'uuid' => $p->user?->uuid,
                    'name' => $p->user?->name,
                ])->all(),
            ],
        ];

        $this->feed->createSystemPost(
            type: Post::TYPE_SYSTEM_RESULT_FRIENDLY,
            author: $winnerCaptain,
            text: $text,
            postType: Post::POST_TYPE_MATCH_RESULT,
            metadata: $metadata,
            aspect: Post::ASPECT_SQUARE,
        );
    }

    /**
     * "Alice & Thomas" — format binôme double padel.
     *
     * @param  \Illuminate\Support\Collection<int, FriendlyMatchParticipant>  $pair
     */
    private function formatPair($pair): string
    {
        $names = $pair->map(fn ($p) => $p->user?->name ?? '?')->all();
        return implode(' & ', $names);
    }
}
