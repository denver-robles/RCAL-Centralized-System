<?php

namespace Tests\Feature;

use App\Models\ChartOfAccount;
use App\Models\Parish;
use App\Models\Transaction;
use App\Models\TransactionLine;
use App\Models\User;
use Database\Seeders\ChartOfAccountSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ParishLedgerModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_chart_of_account(): void
    {
        $account = ChartOfAccount::create([
            'code' => '1102',
            'title' => 'Cash on Hand',
            'type' => 'asset',
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('chart_of_accounts', [
            'id' => $account->id,
            'code' => '1102',
            'title' => 'Cash on Hand',
            'type' => 'asset',
            'is_active' => 1,
        ]);

        $this->assertTrue($account->is_active);
    }

    public function test_can_create_transaction_with_relationships_and_preparer(): void
    {
        $parish = Parish::factory()->create([
            'name' => 'St. Joseph Parish',
            'city_municipality' => 'Lipa City',
            'is_active' => true,
        ]);

        $preparer = User::factory()->create(['home_parish_id' => $parish->id]);

        $transaction = Transaction::create([
            'parish_id' => $parish->id,
            'reference_no' => 'OR-2026-0001',
            'transaction_date' => '2026-11-16',
            'type' => 'receipt',
            'contact_name' => 'Juan Dela Cruz',
            'description' => 'Baptismal stole fee offering',
            'status' => 'posted',
            'prepared_by' => $preparer->id,
        ]);

        $cashAccount = ChartOfAccount::create([
            'code' => '1010',
            'title' => 'Cash on Hand',
            'type' => 'asset',
            'is_active' => true,
        ]);

        $revenueAccount = ChartOfAccount::create([
            'code' => '4020',
            'title' => 'Stole Fees - Baptism',
            'type' => 'revenue',
            'is_active' => true,
        ]);

        // Double-entry lines: Debit Cash 500, Credit Revenue 500
        $debitLine = TransactionLine::create([
            'transaction_id' => $transaction->id,
            'chart_of_account_id' => $cashAccount->id,
            'debit_amount' => 500.00,
            'credit_amount' => 0.00,
            'notes' => 'Received cash for certificate and stole fee',
        ]);

        $creditLine = TransactionLine::create([
            'transaction_id' => $transaction->id,
            'chart_of_account_id' => $revenueAccount->id,
            'debit_amount' => 0.00,
            'credit_amount' => 500.00,
            'notes' => 'Baptism ceremony stole fee revenue',
        ]);

        // Test relationships
        $this->assertEquals(2, $transaction->lines()->count());
        $this->assertEquals($preparer->id, $transaction->preparer->id);
        $this->assertEquals($parish->id, $transaction->parish->id);

        $this->assertEquals($transaction->id, $debitLine->transaction->id);
        $this->assertEquals($cashAccount->id, $debitLine->account->id);

        // Test reverse relationships
        $this->assertTrue($parish->transactions->contains($transaction));
        $this->assertTrue($preparer->preparedTransactions->contains($transaction));
        $this->assertTrue($cashAccount->lines->contains($debitLine));
        $this->assertTrue($revenueAccount->lines->contains($creditLine));

        // Test double-entry balance methods
        $this->assertEquals(500.00, $transaction->totalDebit());
        $this->assertEquals(500.00, $transaction->totalCredit());
        $this->assertTrue($transaction->isBalanced());
    }

    public function test_transaction_detects_unbalanced_entries(): void
    {
        $transaction = Transaction::factory()->create();
        $account = ChartOfAccount::factory()->create(['type' => 'asset']);

        TransactionLine::create([
            'transaction_id' => $transaction->id,
            'chart_of_account_id' => $account->id,
            'debit_amount' => 1000.00,
            'credit_amount' => 0.00,
        ]);

        $this->assertEquals(1000.00, $transaction->totalDebit());
        $this->assertEquals(0.00, $transaction->totalCredit());
        $this->assertFalse($transaction->isBalanced());
    }

    public function test_transaction_is_immutable_once_recorded(): void
    {
        $transaction = Transaction::factory()->create();

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('immutable once recorded');

        $transaction->update(['contact_name' => 'Changed Name']);
    }

    public function test_transaction_cannot_be_deleted(): void
    {
        $transaction = Transaction::factory()->create();

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('cannot be deleted');

        $transaction->delete();
    }

    public function test_transaction_date_casting(): void
    {
        $parish = Parish::factory()->create();

        $transaction = Transaction::create([
            'parish_id' => $parish->id,
            'reference_no' => 'CV-2026-0099',
            'transaction_date' => '2026-11-16',
            'type' => 'check',
            'status' => 'posted',
        ]);

        $this->assertInstanceOf(\Carbon\CarbonInterface::class, $transaction->transaction_date);
        $this->assertEquals('2026-11-16', $transaction->transaction_date->format('Y-m-d'));
    }

    public function test_chart_of_account_seeder_populates_standard_accounts(): void
    {
        $this->seed(ChartOfAccountSeeder::class);

        $this->assertDatabaseHas('chart_of_accounts', ['code' => '1102', 'title' => 'Cash on Hand', 'type' => 'asset']);
        $this->assertDatabaseHas('chart_of_accounts', ['code' => '2101', 'type' => 'liability']);
        $this->assertDatabaseHas('chart_of_accounts', ['code' => '3100', 'type' => 'equity']);
        $this->assertDatabaseHas('chart_of_accounts', ['code' => '4201', 'title' => 'Baptisms (Stole Fees)', 'type' => 'revenue', 'default_amount' => 800.00]);
        $this->assertDatabaseHas('chart_of_accounts', ['code' => '520101', 'title' => 'Electricity', 'type' => 'expense']);
        $this->assertGreaterThanOrEqual(200, ChartOfAccount::count());
    }
}
