<?php

namespace App\Modules\Waitlist\Requests;

use App\Models\WaitlistEntry;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class JoinWaitlistRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('email')) {
            $this->merge(['email' => strtolower(trim($this->input('email')))]);
        }
    }

    public function rules(): array
    {
        // email est nullable ici : le controller exigera l'email OU un user auth (sinon 422 via after).
        return [
            'feature' => ['required', 'string', Rule::in(WaitlistEntry::FEATURES)],
            'email' => ['nullable', 'string', 'email:rfc', 'max:191'],
        ];
    }
}
