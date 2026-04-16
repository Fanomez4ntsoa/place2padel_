<?php

namespace App\Modules\GameProposal\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RespondGameProposalRequest extends FormRequest
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
