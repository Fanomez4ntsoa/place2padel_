<?php

/**
 * Bootstrap PHPUnit — force les variables d'env AVANT que Laravel ne charge
 * .env. Les `<env>` tags dans phpunit.xml sont appliqués TROP TARD côté
 * PHPUnit 12 + Laravel 12 : Laravel boote dans le `createApplication()` des
 * tests, puis l'app repose sur config() qui a déjà lu .env.
 *
 * On pré-positionne les env vars dans les 3 adapters que Laravel lit
 * (putenv, $_ENV, $_SERVER), ce qui fait que `LoadEnvironmentVariables`
 * détecte APP_ENV=testing au boot et charge .env.testing au lieu de .env.
 */

$testEnv = [
    'APP_ENV' => 'testing',
    'APP_MAINTENANCE_DRIVER' => 'file',
    'BCRYPT_ROUNDS' => '4',
    'BROADCAST_CONNECTION' => 'null',
    'CACHE_STORE' => 'array',
    'DB_CONNECTION' => 'mysql',
    'DB_HOST' => '127.0.0.1',
    'DB_PORT' => '3306',
    'DB_DATABASE' => 'place2padel_test',
    'DB_USERNAME' => 'admin',
    'DB_PASSWORD' => 'admin2025',
    'MAIL_MAILER' => 'array',
    'QUEUE_CONNECTION' => 'sync',
    'SESSION_DRIVER' => 'array',
    'SANCTUM_STATEFUL_DOMAINS' => '',
    'PULSE_ENABLED' => 'false',
    'TELESCOPE_ENABLED' => 'false',
    'NIGHTWATCH_ENABLED' => 'false',
];

foreach ($testEnv as $key => $value) {
    putenv("{$key}={$value}");
    $_ENV[$key] = $value;
    $_SERVER[$key] = $value;
}

require __DIR__.'/../vendor/autoload.php';
