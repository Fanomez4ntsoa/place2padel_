<?php

namespace App\Modules\Matchmaking\Requests;

use App\Models\Swipe;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SwipeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'target_uuid' => ['required', 'uuid', Rule::exists('users', 'uuid')],
            'action' => ['required', Rule::in(Swipe::ACTIONS)],
        ];
    }
}
