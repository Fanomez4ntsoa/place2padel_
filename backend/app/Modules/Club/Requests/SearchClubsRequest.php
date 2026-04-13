<?php

namespace App\Modules\Club\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SearchClubsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Tous filtres optionnels — sans filtre = liste complète paginée.
            'q' => ['sometimes', 'string', 'min:2', 'max:100'],
            'city' => ['sometimes', 'string', 'min:2', 'max:100'],
            'department' => ['sometimes', 'string', 'max:3'],
            'region' => ['sometimes', 'string', 'max:100'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ];
    }

    public function messages(): array
    {
        return [
            'q.min' => 'Recherche nécessite au moins 2 caractères.',
            'city.min' => 'Ville nécessite au moins 2 caractères.',
        ];
    }
}
