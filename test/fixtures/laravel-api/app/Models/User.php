<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Model
{
    protected $table = 'users';

    protected $fillable = ['name', 'email', 'password', 'role'];

    protected $guarded = ['id'];

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
