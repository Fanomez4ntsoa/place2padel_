<?php

return [

    /*
    |--------------------------------------------------------------------------
    | FFT Level Limits (padel points)
    |--------------------------------------------------------------------------
    |
    | Plafond de points FFT par niveau de tournoi. Un joueur ne peut s'inscrire
    | à un tournoi P25 que si ses padel_points sont <= 30000, etc.
    | Repris directement du prototype Emergent (server.py:3040) et étendu aux
    | niveaux P250/P500/P1000/P2000.
    |
    */

    'level_limits' => [
        'P25' => 30000,
        'P50' => 10000,
        'P100' => 5000,
        'P250' => 2500,
        'P500' => 1500,
        'P1000' => 800,
        'P2000' => 400,
    ],

];
