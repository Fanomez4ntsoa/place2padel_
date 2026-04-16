<?php

namespace Tests\Unit\Payment;

use App\Modules\Payment\Support\PriceParser;
use PHPUnit\Framework\TestCase;

class PriceParserTest extends TestCase
{
    public function test_parses_standard_formats(): void
    {
        $this->assertSame(15.0, PriceParser::toEuros('15€'));
        $this->assertSame(20.0, PriceParser::toEuros('20 €'));
        $this->assertSame(15.0, PriceParser::toEuros('15€/équipe'));
        $this->assertSame(12.5, PriceParser::toEuros('12.5€'));
        $this->assertSame(12.5, PriceParser::toEuros('12,5€'));
        $this->assertSame(30.0, PriceParser::toEuros('30'));
    }

    public function test_returns_null_for_empty_or_zero(): void
    {
        $this->assertNull(PriceParser::toEuros(null));
        $this->assertNull(PriceParser::toEuros(''));
        $this->assertNull(PriceParser::toEuros('gratuit'));
        $this->assertNull(PriceParser::toEuros('0€'));
    }

    public function test_to_cents_conversion(): void
    {
        $this->assertSame(1500, PriceParser::toCents('15€'));
        $this->assertSame(1250, PriceParser::toCents('12,5€'));
        $this->assertNull(PriceParser::toCents('gratuit'));
    }
}
