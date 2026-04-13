<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class ScrapeClubsFromEmergent extends Command
{
    protected $signature = 'clubs:scrape-from-emergent
                            {--base=https://www.placetopadel.com : Emergent prod base URL}
                            {--output=database/seeders/data/clubs.json : Output JSON path}
                            {--delay=100 : Delay between calls in milliseconds}';

    protected $description = 'One-shot scraper : récupère tous les clubs depuis l\'API Emergent prod et génère le JSON pour ClubsSeeder.';

    private const QUERIES = [
        'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
        'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
        'padel', 'tennis', 'club', 'centre', 'sport',
    ];

    public function handle(): int
    {
        $base = rtrim((string) $this->option('base'), '/');
        $delayMs = (int) $this->option('delay');
        $outputPath = base_path((string) $this->option('output'));

        $this->info("Scraping {$base}/api/clubs/search avec ".count(self::QUERIES).' requêtes…');

        $unique = [];
        $bar = $this->output->createProgressBar(count(self::QUERIES));
        $bar->start();

        foreach (self::QUERIES as $q) {
            try {
                $response = Http::timeout(15)->get("{$base}/api/clubs/search", ['q' => $q]);
                if ($response->successful()) {
                    foreach ($response->json() ?? [] as $club) {
                        $key = mb_strtolower(($club['name'] ?? '').'|'.($club['postal_code'] ?? ''));
                        $unique[$key] = $club;
                    }
                }
            } catch (\Throwable $e) {
                $this->warn("\nErreur sur q={$q} : {$e->getMessage()}");
            }
            $bar->advance();
            usleep($delayMs * 1000);
        }
        $bar->finish();
        $this->newLine(2);

        $this->info('Clubs uniques bruts : '.count($unique));

        $clubs = $this->normalize(array_values($unique));

        File::ensureDirectoryExists(dirname($outputPath));
        File::put($outputPath, json_encode($clubs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        $this->info("Écrit {$outputPath} (".count($clubs).' clubs)');

        $this->table(
            ['Région', 'Nb clubs'],
            collect($clubs)->groupBy('region')->map->count()->sortDesc()->map(fn ($n, $r) => [$r, $n])->values(),
        );

        return self::SUCCESS;
    }

    /**
     * Normalise + génère slug, region depuis department.
     *
     * @param  list<array<string,mixed>>  $raw
     * @return list<array<string,mixed>>
     */
    private function normalize(array $raw): array
    {
        $out = [];
        foreach ($raw as $club) {
            $name = trim((string) ($club['name'] ?? ''));
            $postal = trim((string) ($club['postal_code'] ?? ''));
            $department = $this->normalizeDepartment($postal);

            if ($name === '' || $postal === '') {
                continue;
            }

            $out[] = [
                'name' => $name,
                'slug' => Str::slug($name).'-'.$postal,
                'address' => trim((string) ($club['address'] ?? '')) ?: null,
                'city' => trim((string) ($club['city'] ?? '')) ?: null,
                'postal_code' => $postal,
                'department' => $department,
                'region' => $this->departmentToRegion($department),
                'country' => 'FR',
                'is_active' => true,
            ];
        }
        return $out;
    }

    /**
     * Postal code → code département officiel (gère DOM-TOM + Corse).
     */
    private function normalizeDepartment(string $postal): ?string
    {
        if (preg_match('/^9[78]\d/', $postal)) {
            return substr($postal, 0, 3); // 971-976
        }
        if (str_starts_with($postal, '20')) {
            // Corse : 200xx-201xx → 2A, 202xx-206xx → 2B
            $sub = (int) substr($postal, 2, 3);
            return $sub < 200 ? '2A' : '2B';
        }
        return substr($postal, 0, 2) ?: null;
    }

    private function departmentToRegion(?string $dep): string
    {
        if ($dep === null) {
            return 'Inconnue';
        }
        $map = [
            'Auvergne-Rhône-Alpes' => ['01', '03', '07', '15', '26', '38', '42', '43', '63', '69', '73', '74'],
            'Bourgogne-Franche-Comté' => ['21', '25', '39', '58', '70', '71', '89', '90'],
            'Bretagne' => ['22', '29', '35', '56'],
            'Centre-Val de Loire' => ['18', '28', '36', '37', '41', '45'],
            'Corse' => ['2A', '2B'],
            'Grand Est' => ['08', '10', '51', '52', '54', '55', '57', '67', '68', '88'],
            'Hauts-de-France' => ['02', '59', '60', '62', '80'],
            'Île-de-France' => ['75', '77', '78', '91', '92', '93', '94', '95'],
            'Normandie' => ['14', '27', '50', '61', '76'],
            'Nouvelle-Aquitaine' => ['16', '17', '19', '23', '24', '33', '40', '47', '64', '79', '86', '87'],
            'Occitanie' => ['09', '11', '12', '30', '31', '32', '34', '46', '48', '65', '66', '81', '82'],
            'Pays de la Loire' => ['44', '49', '53', '72', '85'],
            'Provence-Alpes-Côte d\'Azur' => ['04', '05', '06', '13', '83', '84'],
            'Guadeloupe' => ['971'],
            'Martinique' => ['972'],
            'Guyane' => ['973'],
            'La Réunion' => ['974'],
            'Mayotte' => ['976'],
        ];
        foreach ($map as $region => $deps) {
            if (in_array($dep, $deps, true)) {
                return $region;
            }
        }
        return 'Inconnue';
    }
}
