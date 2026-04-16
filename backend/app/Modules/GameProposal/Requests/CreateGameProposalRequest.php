<?php

namespace App\Modules\GameProposal\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateGameProposalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'time' => ['required', 'date_format:H:i'],
            'duration_min' => ['nullable', 'integer', 'min:30', 'max:480'],
            'club' => ['nullable', 'string', 'max:255'],
            'club_city' => ['nullable', 'string', 'max:100'],
            'invitee_uuids' => ['required', 'array', 'min:1', 'max:10'],
            'invitee_uuids.*' => ['uuid', Rule::exists('users', 'uuid')],
        ];
    }
}
