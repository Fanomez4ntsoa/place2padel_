<?php

namespace App\Modules\Matchmaking\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RespondProposalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'response' => ['required', 'in:accepted,refused'],
        ];
    }
}
