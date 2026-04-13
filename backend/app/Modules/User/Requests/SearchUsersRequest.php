<?php

namespace App\Modules\User\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SearchUsersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'q' => ['required', 'string', 'min:2', 'max:100'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ];
    }

    public function messages(): array
    {
        return [
            'q.required' => 'Paramètre de recherche `q` requis.',
            'q.min' => 'Recherche nécessite au moins 2 caractères.',
        ];
    }
}
