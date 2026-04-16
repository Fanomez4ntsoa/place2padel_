<?php

namespace App\Modules\Payment\Support;

/**
 * Helper parsePrice — port fidèle Emergent _parse_price_eur(...).
 *
 * Le prix est stocké en champ texte libre côté tournament (ex: "15€", "20 €",
 * "15€/équipe", "gratuit"). On extrait le premier nombre positif en euros.
 *
 * Retourne null si aucun prix détecté (gratuit / non payant).
 */
class PriceParser
{
    public static function toEuros(?string $raw): ?float
    {
        if (! $raw) {
            return null;
        }

        $normalized = str_replace(',', '.', $raw);
        if (! preg_match('/(\d+(?:\.\d+)?)/', $normalized, $matches)) {
            return null;
        }

        $value = (float) $matches[1];

        return $value > 0 ? $value : null;
    }

    public static function toCents(?string $raw): ?int
    {
        $euros = self::toEuros($raw);
        return $euros === null ? null : (int) round($euros * 100);
    }
}
