<?php

namespace App\Modules\Feed\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class StorePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // autorisation métier gérée dans le controller (rôle/organisateur).
    }

    public function rules(): array
    {
        return [
            'text' => ['nullable', 'string', 'max:5000'],
            'image_url' => ['nullable', 'url', 'max:500'],
            // Upload multipart direct depuis mobile. Aligné sur /profile/photo
            // (mêmes formats + limite 5 MB).
            'image' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'tournament_uuid' => ['nullable', 'uuid', 'exists:tournaments,uuid'],
            // Classification fine — whitelist strict côté client.
            // Seul 'referee_announcement' est exposable aujourd'hui (port Emergent
            // /posts referee/admin only). Les autres post_type sont réservés aux
            // listeners système et ignorés côté controller.
            'post_type' => ['nullable', 'in:referee_announcement'],
        ];
    }

    public function withValidator(Validator $v): void
    {
        $v->after(function (Validator $v) {
            if (! $this->filled('text') && ! $this->filled('image_url') && ! $this->hasFile('image')) {
                $v->errors()->add('text', 'Un post doit contenir du texte ou une image.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'image.max' => 'L\'image ne doit pas dépasser 5 Mo.',
            'image.mimes' => 'Formats acceptés : JPG, PNG, WebP.',
        ];
    }
}
