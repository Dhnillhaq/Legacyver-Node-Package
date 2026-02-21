<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Order extends Model
{
    protected $table = 'orders';

    protected $fillable = ['user_id', 'status', 'total', 'discount', 'notes'];

    protected $guarded = ['id'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'order_tags');
    }

    public function calculateTotal(): float
    {
        $subtotal = 0;
        foreach ($this->items as $item) {
            $subtotal += $item->price * $item->quantity;
        }
        $discount = $this->discount ?? 0;
        if ($discount > 0) {
            $subtotal = $subtotal * (1 - $discount / 100);
        }
        $tax = $subtotal * 0.1;
        return round($subtotal + $tax, 2);
    }
}
