<?php

namespace Tests\Unit\FriendlyMatch;

use App\Modules\FriendlyMatch\Services\ELOService;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests pour l'algo ELO. Doit reproduire EXACTEMENT le contrat Emergent
 * (_calculate_elo_update dans server.py 39b6544 lignes 4484-4490).
 *
 * Fixtures extraites des calculs Python équivalents à 2 décimales près.
 */
class ELOServiceTest extends TestCase
{
    private ELOService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new ELOService();
    }

    public function test_equal_teams_winner_gains_0_15_and_loser_loses_0_15(): void
    {
        // winner_avg=5.0, loser_avg=5.0
        // expected = 1 / (1 + 10^0) = 0.5
        // gain = 0.3 * 0.5 = 0.15
        [$newWinner, $newLoser] = $this->service->calculateUpdate(5.0, 5.0);
        $this->assertSame(5.15, $newWinner);
        $this->assertSame(4.85, $newLoser);
    }

    public function test_favorite_wins_small_delta(): void
    {
        // winner_avg=6.0, loser_avg=4.0
        // expected ≈ 0.7597 → gain ≈ 0.0721
        [$newWinner, $newLoser] = $this->service->calculateUpdate(6.0, 4.0);
        $this->assertSame(6.07, $newWinner);
        $this->assertSame(3.93, $newLoser);
    }

    public function test_outsider_wins_large_delta(): void
    {
        // winner_avg=4.0, loser_avg=6.0
        // expected ≈ 0.2403 → gain ≈ 0.2279
        [$newWinner, $newLoser] = $this->service->calculateUpdate(4.0, 6.0);
        $this->assertSame(4.23, $newWinner);
        $this->assertSame(5.77, $newLoser);
    }

    public function test_clamp_upper_bound_favorite_already_near_10(): void
    {
        // winner_avg=9.9, loser_avg=2.0 — expected ≈ 0.9895, gain ≈ 0.0031
        // new_winner ≈ 9.9031 → round 9.90 (pas clamp car < 10)
        // new_loser ≈ 1.9969 → round 2.00
        [$newWinner, $newLoser] = $this->service->calculateUpdate(9.9, 2.0);
        $this->assertSame(9.90, $newWinner);
        $this->assertSame(2.00, $newLoser);
    }

    public function test_extreme_upset_weakest_beats_strongest(): void
    {
        // winner_avg=2.0, loser_avg=9.9 — expected ≈ 0.01048, gain ≈ 0.2969
        [$newWinner, $newLoser] = $this->service->calculateUpdate(2.0, 9.9);
        $this->assertSame(2.30, $newWinner);
        $this->assertSame(9.60, $newLoser);
    }

    public function test_symmetry_gain_equals_loss_in_absolute_value(): void
    {
        // Propriété : gain winner + perte loser = 0 (somme conservée avant arrondi).
        [$w1, $l1] = $this->service->calculateUpdate(6.0, 4.0);
        $delta = ($w1 - 6.0) + ($l1 - 4.0);
        $this->assertEqualsWithDelta(0.0, $delta, 0.01, 'ELO total doit être conservé');
    }

    public function test_constants_match_emergent_contract(): void
    {
        // Sanity checks des constantes publiques.
        $this->assertSame(0.3, ELOService::K_FACTOR);
        $this->assertSame(4, ELOService::SCALE_DIVIDER);
        $this->assertSame(1.0, ELOService::MIN_ELO);
        $this->assertSame(10.0, ELOService::MAX_ELO);
        $this->assertSame(10, ELOService::LOCK_THRESHOLD);
        $this->assertSame(4, ELOService::DEFAULT_LEVEL);
    }
}
