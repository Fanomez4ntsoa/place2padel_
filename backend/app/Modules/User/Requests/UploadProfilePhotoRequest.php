<?php

namespace App\Modules\User\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UploadProfilePhotoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // max en KB Laravel — 5120 KB = 5 MB (aligné sur Emergent).
            // `image` + `mimes` = double barrière : extension + signature MIME réelle.
            'image' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ];
    }

    public function messages(): array
    {
        return [
            'image.max' => 'L\'image ne doit pas dépasser 5 Mo.',
            'image.mimes' => 'Formats acceptés : JPG, PNG, WebP.',
        ];
    }
}
