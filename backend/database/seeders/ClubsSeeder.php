<?php

namespace Database\Seeders;

use App\Models\Club;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class ClubsSeeder extends Seeder
{
    private const DATA_PATH = 'database/seeders/data/clubs.json';

    public function run(): void
    {
        $path = base_path(self::DATA_PATH);

        if (! File::exists($path)) {
            $this->command?->error("Fichier introuvable : {$path}");
            $this->command?->warn('Lance d\'abord : php artisan clubs:scrape-from-emergent');
            return;
        }

        $clubs = json_decode(File::get($path), true);

        if (! is_array($clubs)) {
            $this->command?->error('JSON invalide.');
            return;
        }

        $created = 0;
        $updated = 0;

        foreach ($clubs as $data) {
            $club = Club::where('slug', $data['slug'])->first();

            if ($club) {
                $club->update($data);
                $updated++;
            } else {
                Club::create($data);
                $created++;
            }
        }

        $this->command?->info("ClubsSeeder : {$created} créés, {$updated} mis à jour (".count($clubs).' total)');
    }
}
