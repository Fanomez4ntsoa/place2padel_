<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class FFTRankingsSeeder extends Seeder
{
    private const CSV_PATH = 'database/seeders/data/fft_rankings.csv';

    public function run(): void
    {
        $csvPath = base_path(self::CSV_PATH);

        if (! File::exists($csvPath)) {
            $this->command?->error("CSV introuvable : {$csvPath}");
            $this->command?->warn('Lance d\'abord : python scripts/extract_fft_rankings.py');
            return;
        }

        $this->command?->info('Truncate tenup_rankings…');
        DB::statement('TRUNCATE TABLE tenup_rankings');

        $sizeMB = number_format(filesize($csvPath) / (1024 * 1024), 1);
        $this->command?->info("LOAD DATA LOCAL INFILE ({$sizeMB} MB)…");
        $start = microtime(true);

        $pdo = DB::connection()->getPdo();
        $quoted = $pdo->quote($csvPath);

        $pdo->exec(<<<SQL
            LOAD DATA LOCAL INFILE {$quoted}
            INTO TABLE tenup_rankings
            CHARACTER SET utf8mb4
            FIELDS TERMINATED BY ',' ENCLOSED BY '"'
            LINES TERMINATED BY '\\n'
            IGNORE 1 LINES
            (name, first_name, last_name, @ranking, points, @evolution, gender, country, @region, updated_at)
            SET
                ranking = NULLIF(@ranking, ''),
                evolution = NULLIF(@evolution, ''),
                region = NULLIF(@region, '')
        SQL);

        $count = DB::table('tenup_rankings')->count();
        $elapsed = microtime(true) - $start;

        $this->command?->info(sprintf(
            'FFTRankingsSeeder : %s lignes importées en %.1fs',
            number_format($count, 0, ',', ' '),
            $elapsed,
        ));
    }
}
