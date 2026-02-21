<?php

namespace App\Providers;

use App\Services\OrderService;
use App\Repositories\OrderRepository;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(OrderService::class, function ($app) {
            return new OrderService($app->make(OrderRepository::class));
        });

        $this->app->bind(OrderRepository::class, function ($app) {
            return new OrderRepository();
        });
    }

    public function boot(): void
    {
        // Boot application services
    }
}
