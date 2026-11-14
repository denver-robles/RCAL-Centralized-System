#!/usr/bin/env bash
set -e

# 1. Bind Apache to Render's dynamic $PORT (defaults to 8080 locally)
PORT="${PORT:-8080}"
sed -i "s/80/${PORT}/g" /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf

# 2. If using SQLite, ensure the database file exists and is writable
if [ "${DB_CONNECTION}" = "sqlite" ]; then
    touch /var/www/html/database/database.sqlite
    chown www-data:www-data /var/www/html/database/database.sqlite
fi

# 3. Clear and cache Laravel configurations for production performance
php artisan config:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 4. Link public storage
php artisan storage:link --force || true

# 5. Run database migrations automatically on deploy
php artisan migrate --force

# Optional: Run DatabaseSeeder if RUN_SEEDER=true is set in Render Env Vars
if [ "${RUN_SEEDER}" = "true" ]; then
    php artisan db:seed --force
fi

# 6. Start Apache
exec apache2-foreground