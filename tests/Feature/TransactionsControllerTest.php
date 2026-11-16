<?php

namespace Tests\Feature;

use App\Enums\RoleEnum;
use App\Models\ChartOfAccount;
use App\Models\Parish;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransactionsControllerTest extends TestCase
{
    use RefreshDatabase;

    protected Parish $parish;

    protected User $staff;

    protected ChartOfAccount $cashAccount;

    protected ChartOfAccount $revenueAccount;

    protected ChartOfAccount $bankAccount;

    protected ChartOfAccount $expenseAccount;

    protected function setUp(): void
    {
        parent::setUp();

        $this->parish = Parish::factory()->create([
            'name' => 'St. Joseph Parish',
        ]);

        $this->staff = User::factory()->create([
            'role' => RoleEnum::PARISH_STAFF,
            'home_parish_id' => $this->parish->id,
        ]);

        $this->cashAccount = ChartOfAccount::create([
            'code' => '1010',
            'title' => 'Cash on Hand',
            'type' => 'asset',
            'is_active' => true,
        ]);

        $this->bankAccount = ChartOfAccount::create([
            'code' => '1020',
            'title' => 'RCBC Operating Account',
            'type' => 'asset',
            'is_active' => true,
        ]);

        $this->revenueAccount = ChartOfAccount::create([
            'code' => '4010',
            'title' => 'Sunday Collection',
            'type' => 'revenue',
            'is_active' => true,
        ]);

        $this->expenseAccount = ChartOfAccount::create([
            'code' => '5010',
            'title' => 'Office & Administrative Supplies',
            'type' => 'expense',
            'is_active' => true,
        ]);
    }

    public function test_staff_can_view_parish_ledger_dashboard(): void
    {
        $response = $this->actingAs($this->staff)->get('/ledger');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Ledger/Index')
            ->has('transactions')
            ->has('accounts')
            ->has('suggestedOr')
            ->has('suggestedCv')
            ->has('kpis')
        );
    }

    public function test_parishioner_cannot_access_ledger(): void
    {
        $parishioner = User::factory()->create([
            'role' => RoleEnum::PARISHIONER,
        ]);

        $response = $this->actingAs($parishioner)->get('/ledger');
        $response->assertForbidden();
    }

    public function test_can_store_balanced_official_receipt_instantly_in_records(): void
    {
        $payload = [
            'reference_no' => 'OR-2026-0001',
            'transaction_date' => '2026-11-16',
            'contact_name' => 'Maria Santos',
            'description' => 'Sunday Mass Collection & Stole Fee',
            'type' => 'receipt',
            'lines' => [
                'credits' => [
                    [
                        'account_id' => $this->revenueAccount->id,
                        'amount' => 1500.00,
                        'notes' => 'Collection remittance',
                    ],
                ],
                'debits' => [
                    [
                        'account_id' => $this->cashAccount->id,
                        'amount' => 1500.00,
                        'notes' => 'Cash box receipt',
                    ],
                ],
            ],
        ];

        $response = $this->actingAs($this->staff)->post('/ledger/transactions', $payload);

        $response->assertRedirect('/ledger');
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('transactions', [
            'reference_no' => 'OR-2026-0001',
            'parish_id' => $this->parish->id,
            'contact_name' => 'Maria Santos',
            'type' => 'receipt',
            'status' => 'posted',
            'prepared_by' => $this->staff->id,
        ]);

        $transaction = Transaction::where('reference_no', 'OR-2026-0001')->first();
        $this->assertNotNull($transaction);
        $this->assertEquals(2, $transaction->lines()->count());
        $this->assertEquals(1500.00, $transaction->totalDebit());
        $this->assertEquals(1500.00, $transaction->totalCredit());
        $this->assertTrue($transaction->isBalanced());
    }

    public function test_can_store_balanced_check_voucher_expense_instantly_in_records(): void
    {
        $payload = [
            'reference_no' => 'CV-2026-0001',
            'transaction_date' => '2026-11-16',
            'contact_name' => 'National Book Store / Office Supplies Co.',
            'description' => 'Check #003912 - Parish office stationery and sacramental certificates',
            'type' => 'check',
            'lines' => [
                'credits' => [
                    [
                        'account_id' => $this->bankAccount->id,
                        'amount' => 4500.00,
                        'notes' => 'Disbursed via RCBC Current Account',
                    ],
                ],
                'debits' => [
                    [
                        'account_id' => $this->expenseAccount->id,
                        'amount' => 4500.00,
                        'notes' => 'Stationery and certificate stock',
                    ],
                ],
            ],
        ];

        $response = $this->actingAs($this->staff)->post('/ledger/transactions', $payload);

        $response->assertRedirect('/ledger');
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('transactions', [
            'reference_no' => 'CV-2026-0001',
            'parish_id' => $this->parish->id,
            'contact_name' => 'National Book Store / Office Supplies Co.',
            'type' => 'check',
            'status' => 'posted',
            'prepared_by' => $this->staff->id,
        ]);

        $transaction = Transaction::where('reference_no', 'CV-2026-0001')->first();
        $this->assertNotNull($transaction);
        $this->assertEquals(2, $transaction->lines()->count());
        $this->assertEquals(4500.00, $transaction->totalDebit());
        $this->assertEquals(4500.00, $transaction->totalCredit());
        $this->assertTrue($transaction->isBalanced());
    }

    public function test_rejects_unbalanced_transaction(): void
    {
        $payload = [
            'reference_no' => 'OR-2026-0002',
            'transaction_date' => '2026-11-16',
            'contact_name' => 'Unbalanced Payee',
            'type' => 'receipt',
            'lines' => [
                'credits' => [
                    [
                        'account_id' => $this->revenueAccount->id,
                        'amount' => 1000.00,
                    ],
                ],
                'debits' => [
                    [
                        'account_id' => $this->cashAccount->id,
                        'amount' => 800.00, // Out of balance by 200
                    ],
                ],
            ],
        ];

        $response = $this->actingAs($this->staff)->post('/ledger/transactions', $payload);

        $response->assertSessionHasErrors('balance');
        $this->assertDatabaseMissing('transactions', [
            'reference_no' => 'OR-2026-0002',
        ]);
    }

    public function test_transaction_is_immutable_once_recorded(): void
    {
        $transaction = Transaction::factory()->create([
            'parish_id' => $this->parish->id,
            'status' => 'posted',
            'prepared_by' => $this->staff->id,
        ]);

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('Parish Ledger Invariant');

        $transaction->update(['contact_name' => 'Modified Name']);
    }

    public function test_transaction_cannot_be_deleted(): void
    {
        $transaction = Transaction::factory()->create([
            'parish_id' => $this->parish->id,
            'status' => 'posted',
            'prepared_by' => $this->staff->id,
        ]);

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('cannot be deleted');

        $transaction->delete();
    }
}
