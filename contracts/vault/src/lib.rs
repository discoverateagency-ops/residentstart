//! Residentstart vault contract: loans and repayment receipts.
//!
//! Interface (docs/PRD.md "Contract interfaces"):
//! create_loan, record_repayment (owner only), get_loan, get_repayments.
//! Rupiah amounts are integer strings (U128) to avoid overflow.
//! remaining_idr = monthly_idr * tenor_months - sum(recorded amounts), floored at 0.

use near_sdk::json_types::U128;
use near_sdk::store::LookupMap;
use near_sdk::{env, log, near, require, AccountId, PanicOnDefault};

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Loan {
    pub loan_id: String,
    pub project_id: String,
    pub borrower_ref: String,
    pub principal_idr: U128,
    pub tenor_months: u32,
    pub monthly_idr: U128,
    pub start_ts: u64,
    pub paid_periods: u32,
    pub paid_total_idr: U128,
    pub remaining_idr: U128,
    /// active | completed
    pub status: String,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Repayment {
    pub period_index: u32,
    pub amount_idr: U128,
    pub receipt_hash: String,
    /// block timestamp in nanoseconds
    pub ts: u64,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    owner_id: AccountId,
    loans: LookupMap<String, Loan>,
    repayments: LookupMap<String, Vec<Repayment>>,
}

fn emit(event: &str, data: String) {
    log!(
        "EVENT_JSON:{{\"standard\":\"residentstart\",\"version\":\"1.0.0\",\"event\":\"{}\",\"data\":[{}]}}",
        event,
        data
    );
}

#[near]
impl Contract {
    #[init]
    pub fn new(owner_id: AccountId) -> Self {
        Self { owner_id, loans: LookupMap::new(b"l"), repayments: LookupMap::new(b"r") }
    }

    fn assert_owner(&self) {
        require!(env::predecessor_account_id() == self.owner_id, "Only the owner can call this method");
    }

    #[allow(clippy::too_many_arguments)]
    pub fn create_loan(
        &mut self,
        loan_id: String,
        project_id: String,
        borrower_ref: String,
        principal_idr: U128,
        tenor_months: u32,
        monthly_idr: U128,
        start_ts: u64,
    ) {
        self.assert_owner();
        require!(!loan_id.is_empty(), "loan_id required");
        require!(self.loans.get(&loan_id).is_none(), "Loan already exists");
        require!(tenor_months > 0, "tenor_months must be > 0");
        require!(monthly_idr.0 > 0, "monthly_idr must be > 0");
        let total = monthly_idr.0 * tenor_months as u128;
        self.loans.insert(
            loan_id.clone(),
            Loan {
                loan_id: loan_id.clone(),
                project_id: project_id.clone(),
                borrower_ref,
                principal_idr,
                tenor_months,
                monthly_idr,
                start_ts,
                paid_periods: 0,
                paid_total_idr: U128(0),
                remaining_idr: U128(total),
                status: "active".into(),
            },
        );
        self.repayments.insert(loan_id.clone(), vec![]);
        emit(
            "create_loan",
            format!(
                "{{\"loan_id\":\"{}\",\"project_id\":\"{}\",\"tenor_months\":{},\"monthly_idr\":\"{}\"}}",
                loan_id, project_id, tenor_months, monthly_idr.0
            ),
        );
    }

    pub fn record_repayment(&mut self, loan_id: String, period_index: u32, amount_idr: U128, receipt_hash: String) {
        self.assert_owner();
        let mut loan = self.loans.get(&loan_id).cloned().unwrap_or_else(|| env::panic_str("Loan not found"));
        require!(loan.status == "active", "Loan is not active");
        require!(period_index >= 1 && period_index <= loan.tenor_months, "period_index out of range");
        require!(receipt_hash.len() == 64, "receipt_hash must be a sha256 hex string");
        let mut list = self.repayments.get(&loan_id).cloned().unwrap_or_default();
        require!(!list.iter().any(|r| r.period_index == period_index), "Period already recorded");
        list.push(Repayment {
            period_index,
            amount_idr,
            receipt_hash: receipt_hash.clone(),
            ts: env::block_timestamp(),
        });
        loan.paid_periods += 1;
        loan.paid_total_idr = U128(loan.paid_total_idr.0 + amount_idr.0);
        loan.remaining_idr = U128(loan.remaining_idr.0.saturating_sub(amount_idr.0));
        if loan.paid_periods >= loan.tenor_months {
            loan.status = "completed".into();
        }
        self.loans.insert(loan_id.clone(), loan);
        self.repayments.insert(loan_id.clone(), list);
        emit(
            "record_repayment",
            format!(
                "{{\"loan_id\":\"{}\",\"period_index\":{},\"amount_idr\":\"{}\",\"receipt_hash\":\"{}\"}}",
                loan_id, period_index, amount_idr.0, receipt_hash
            ),
        );
    }

    pub fn get_owner(&self) -> AccountId {
        self.owner_id.clone()
    }

    pub fn get_loan(&self, loan_id: String) -> Option<Loan> {
        self.loans.get(&loan_id).cloned()
    }

    pub fn get_repayments(&self, loan_id: String) -> Vec<Repayment> {
        self.repayments.get(&loan_id).cloned().unwrap_or_default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::testing_env;

    const H: &str = "a3f0000000000000000000000000000000000000000000000000000000009c1a";

    fn ctx(predecessor: AccountId) {
        let mut b = VMContextBuilder::new();
        b.predecessor_account_id(predecessor);
        testing_env!(b.build());
    }

    fn setup() -> Contract {
        ctx(accounts(0));
        let mut c = Contract::new(accounts(0));
        c.create_loan("L1".into(), "p1".into(), "L1".into(), U128(2_280_000_000), 120, U128(27_662_920), 0);
        c
    }

    #[test]
    fn two_repayments_update_progress() {
        let mut c = setup();
        let before = c.get_loan("L1".into()).unwrap().remaining_idr.0;
        assert_eq!(before, 27_662_920u128 * 120);
        c.record_repayment("L1".into(), 1, U128(27_662_920), H.into());
        c.record_repayment("L1".into(), 2, U128(27_662_920), H.into());
        let l = c.get_loan("L1".into()).unwrap();
        assert_eq!(l.paid_periods, 2);
        assert_eq!(l.remaining_idr.0, before - 2 * 27_662_920);
        assert_eq!(c.get_repayments("L1".into()).len(), 2);
    }

    #[test]
    #[should_panic(expected = "Period already recorded")]
    fn duplicate_period_rejected() {
        let mut c = setup();
        c.record_repayment("L1".into(), 1, U128(1), H.into());
        c.record_repayment("L1".into(), 1, U128(1), H.into());
    }

    #[test]
    #[should_panic(expected = "period_index out of range")]
    fn period_beyond_tenor_rejected() {
        let mut c = setup();
        c.record_repayment("L1".into(), 121, U128(1), H.into());
    }

    #[test]
    #[should_panic(expected = "Only the owner")]
    fn non_owner_rejected() {
        let mut c = setup();
        ctx(accounts(1));
        c.record_repayment("L1".into(), 1, U128(1), H.into());
    }

    #[test]
    fn completes_after_last_period() {
        ctx(accounts(0));
        let mut c = Contract::new(accounts(0));
        c.create_loan("L2".into(), "p1".into(), "L2".into(), U128(100), 2, U128(60), 0);
        c.record_repayment("L2".into(), 1, U128(60), H.into());
        c.record_repayment("L2".into(), 2, U128(60), H.into());
        assert_eq!(c.get_loan("L2".into()).unwrap().status, "completed");
        assert_eq!(c.get_loan("L2".into()).unwrap().remaining_idr.0, 0);
    }
}
