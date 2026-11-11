//! Residentstart DAO contract: projects, shares, funding proposals and votes.
//!
//! Interface (docs/PRD.md "Contract interfaces"):
//! create_project, invest (payable), create_proposal, vote, finalize_proposal,
//! get_project, get_holding, get_proposal.
//! Extra owner-only demo helpers: set_project_status, admin_withdraw.

use near_sdk::json_types::U128;
use near_sdk::store::LookupMap;
use near_sdk::{env, log, near, require, AccountId, NearToken, PanicOnDefault, Promise};

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Project {
    pub name: String,
    pub share_price_yocto: U128,
    pub total_shares: u32,
    pub shares_sold: u32,
    /// funding | funded | in_construction | completed
    pub status: String,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Voter {
    pub account_id: AccountId,
    pub yes: bool,
    pub weight: u32,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Proposal {
    pub id: String,
    pub project_id: String,
    pub kind: String,
    pub description: String,
    pub yes_weight: u64,
    pub no_weight: u64,
    /// open | approved | rejected
    pub status: String,
    pub voters: Vec<Voter>,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    owner_id: AccountId,
    projects: LookupMap<String, Project>,
    /// key: "<project_id>|<account_id>"
    holdings: LookupMap<String, u32>,
    proposals: LookupMap<String, Proposal>,
    next_proposal_id: u64,
}

fn holding_key(project_id: &str, account_id: &AccountId) -> String {
    format!("{}|{}", project_id, account_id)
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
        Self {
            owner_id,
            projects: LookupMap::new(b"p"),
            holdings: LookupMap::new(b"h"),
            proposals: LookupMap::new(b"r"),
            next_proposal_id: 1,
        }
    }

    fn assert_owner(&self) {
        require!(env::predecessor_account_id() == self.owner_id, "Only the owner can call this method");
    }

    // ---------- writes ----------

    pub fn create_project(&mut self, project_id: String, name: String, share_price_yocto: U128, total_shares: u32) {
        self.assert_owner();
        require!(!project_id.is_empty(), "project_id required");
        require!(self.projects.get(&project_id).is_none(), "Project already exists");
        require!(share_price_yocto.0 > 0, "share_price_yocto must be > 0");
        require!(total_shares > 0, "total_shares must be > 0");
        self.projects.insert(
            project_id.clone(),
            Project { name, share_price_yocto, total_shares, shares_sold: 0, status: "funding".into() },
        );
        emit("create_project", format!("{{\"project_id\":\"{}\",\"total_shares\":{}}}", project_id, total_shares));
    }

    /// Payable. shares = floor(deposit / share_price); remainder refunded.
    /// Rejects (panics, so the whole deposit returns) if the project would be oversold.
    #[payable]
    pub fn invest(&mut self, project_id: String) -> u32 {
        let investor = env::predecessor_account_id();
        let deposit = env::attached_deposit().as_yoctonear();
        require!(deposit > 0, "Attach a NEAR deposit to invest");
        let mut project = self.projects.get(&project_id).cloned().unwrap_or_else(|| env::panic_str("Project not found"));
        require!(project.status == "funding", "Project is not open for funding");
        let price = project.share_price_yocto.0;
        let shares_u128 = deposit / price;
        let remaining = (project.total_shares - project.shares_sold) as u128;
        require!(shares_u128 <= remaining, format!("Only {} shares left", remaining));
        let shares = shares_u128 as u32;
        let refund = deposit - shares_u128 * price;

        if shares > 0 {
            project.shares_sold += shares;
            self.projects.insert(project_id.clone(), project);
            let key = holding_key(&project_id, &investor);
            let prev = self.holdings.get(&key).copied().unwrap_or(0);
            self.holdings.insert(key, prev + shares);
        }
        if refund > 0 {
            Promise::new(investor.clone()).transfer(NearToken::from_yoctonear(refund));
        }
        emit(
            "invest",
            format!(
                "{{\"project_id\":\"{}\",\"account_id\":\"{}\",\"shares\":{},\"deposit\":\"{}\",\"refund\":\"{}\"}}",
                project_id, investor, shares, deposit, refund
            ),
        );
        shares
    }

    pub fn create_proposal(&mut self, project_id: String, kind: String, description: String) -> String {
        self.assert_owner();
        require!(self.projects.get(&project_id).is_some(), "Project not found");
        require!(kind == "approve_funding", "Only kind approve_funding is supported");
        let id = self.next_proposal_id.to_string();
        self.next_proposal_id += 1;
        self.proposals.insert(
            id.clone(),
            Proposal {
                id: id.clone(),
                project_id: project_id.clone(),
                kind,
                description,
                yes_weight: 0,
                no_weight: 0,
                status: "open".into(),
                voters: vec![],
            },
        );
        emit("create_proposal", format!("{{\"proposal_id\":\"{}\",\"project_id\":\"{}\"}}", id, project_id));
        id
    }

    pub fn vote(&mut self, proposal_id: String, yes: bool) -> u32 {
        let voter = env::predecessor_account_id();
        let mut p = self.proposals.get(&proposal_id).cloned().unwrap_or_else(|| env::panic_str("Proposal not found"));
        require!(p.status == "open", "Proposal is not open");
        require!(!p.voters.iter().any(|v| v.account_id == voter), "Already voted");
        let weight = self.holdings.get(&holding_key(&p.project_id, &voter)).copied().unwrap_or(0);
        require!(weight > 0, "Only share holders can vote");
        if yes {
            p.yes_weight += weight as u64;
        } else {
            p.no_weight += weight as u64;
        }
        p.voters.push(Voter { account_id: voter.clone(), yes, weight });
        self.proposals.insert(proposal_id.clone(), p);
        emit(
            "vote",
            format!("{{\"proposal_id\":\"{}\",\"account_id\":\"{}\",\"yes\":{},\"weight\":{}}}", proposal_id, voter, yes, weight),
        );
        weight
    }

    pub fn finalize_proposal(&mut self, proposal_id: String) -> String {
        self.assert_owner();
        let mut p = self.proposals.get(&proposal_id).cloned().unwrap_or_else(|| env::panic_str("Proposal not found"));
        require!(p.status == "open", "Proposal already finalized");
        if p.yes_weight > p.no_weight {
            p.status = "approved".into();
            let mut project = self.projects.get(&p.project_id).cloned().unwrap();
            project.status = "funded".into();
            self.projects.insert(p.project_id.clone(), project);
        } else {
            p.status = "rejected".into();
        }
        let status = p.status.clone();
        emit("finalize_proposal", format!("{{\"proposal_id\":\"{}\",\"status\":\"{}\"}}", proposal_id, status));
        self.proposals.insert(proposal_id, p);
        status
    }

    /// Owner-only demo helper: move a project to in_construction / completed.
    pub fn set_project_status(&mut self, project_id: String, status: String) {
        self.assert_owner();
        require!(
            ["funding", "funded", "in_construction", "completed"].contains(&status.as_str()),
            "Invalid status"
        );
        let mut project = self.projects.get(&project_id).cloned().unwrap_or_else(|| env::panic_str("Project not found"));
        project.status = status;
        self.projects.insert(project_id, project);
    }

    /// Owner-only testnet helper: recycle deposited testnet NEAR back to the owner.
    pub fn admin_withdraw(&mut self, amount_yocto: U128) -> Promise {
        self.assert_owner();
        Promise::new(self.owner_id.clone()).transfer(NearToken::from_yoctonear(amount_yocto.0))
    }

    // ---------- views ----------

    pub fn get_owner(&self) -> AccountId {
        self.owner_id.clone()
    }

    pub fn get_project(&self, project_id: String) -> Option<Project> {
        self.projects.get(&project_id).cloned()
    }

    pub fn get_holding(&self, project_id: String, account_id: AccountId) -> u32 {
        self.holdings.get(&holding_key(&project_id, &account_id)).copied().unwrap_or(0)
    }

    pub fn get_proposal(&self, proposal_id: String) -> Option<Proposal> {
        self.proposals.get(&proposal_id).cloned()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::testing_env;

    const ONE_NEAR: u128 = 1_000_000_000_000_000_000_000_000;

    fn ctx(predecessor: AccountId, deposit: u128) {
        let mut b = VMContextBuilder::new();
        b.predecessor_account_id(predecessor).attached_deposit(NearToken::from_yoctonear(deposit));
        testing_env!(b.build());
    }

    fn setup(total: u32) -> Contract {
        ctx(accounts(0), 0);
        let mut c = Contract::new(accounts(0));
        c.create_project("p1".into(), "Cilandak".into(), U128(10 * ONE_NEAR), total);
        c
    }

    #[test]
    fn invest_buys_shares_and_refunds_remainder() {
        let mut c = setup(200);
        ctx(accounts(1), 25 * ONE_NEAR);
        assert_eq!(c.invest("p1".into()), 2);
        assert_eq!(c.get_holding("p1".into(), accounts(1)), 2);
        assert_eq!(c.get_project("p1".into()).unwrap().shares_sold, 2);
        ctx(accounts(1), 10 * ONE_NEAR);
        assert_eq!(c.invest("p1".into()), 1);
        assert_eq!(c.get_holding("p1".into(), accounts(1)), 3);
    }

    #[test]
    fn invest_below_price_gives_zero_shares() {
        let mut c = setup(200);
        ctx(accounts(1), 5 * ONE_NEAR);
        assert_eq!(c.invest("p1".into()), 0);
        assert_eq!(c.get_holding("p1".into(), accounts(1)), 0);
    }

    #[test]
    #[should_panic(expected = "Only 2 shares left")]
    fn invest_sold_out_rejects() {
        let mut c = setup(2);
        ctx(accounts(1), 30 * ONE_NEAR);
        c.invest("p1".into());
    }

    #[test]
    fn vote_weight_equals_shares_and_finalize_sets_funded() {
        let mut c = setup(200);
        ctx(accounts(1), 30 * ONE_NEAR);
        c.invest("p1".into());
        ctx(accounts(2), 10 * ONE_NEAR);
        c.invest("p1".into());
        ctx(accounts(0), 0);
        let pid = c.create_proposal("p1".into(), "approve_funding".into(), "Approve".into());
        ctx(accounts(1), 0);
        assert_eq!(c.vote(pid.clone(), true), 3);
        ctx(accounts(2), 0);
        assert_eq!(c.vote(pid.clone(), false), 1);
        let p = c.get_proposal(pid.clone()).unwrap();
        assert_eq!((p.yes_weight, p.no_weight), (3, 1));
        ctx(accounts(0), 0);
        assert_eq!(c.finalize_proposal(pid), "approved");
        assert_eq!(c.get_project("p1".into()).unwrap().status, "funded");
    }

    #[test]
    fn finalize_rejected_keeps_funding() {
        let mut c = setup(200);
        ctx(accounts(1), 10 * ONE_NEAR);
        c.invest("p1".into());
        ctx(accounts(0), 0);
        let pid = c.create_proposal("p1".into(), "approve_funding".into(), "Approve".into());
        ctx(accounts(1), 0);
        c.vote(pid.clone(), false);
        ctx(accounts(0), 0);
        assert_eq!(c.finalize_proposal(pid), "rejected");
        assert_eq!(c.get_project("p1".into()).unwrap().status, "funding");
    }

    #[test]
    #[should_panic(expected = "Only share holders can vote")]
    fn non_holder_cannot_vote() {
        let mut c = setup(200);
        let pid = c.create_proposal("p1".into(), "approve_funding".into(), "Approve".into());
        ctx(accounts(3), 0);
        c.vote(pid, true);
    }

    #[test]
    #[should_panic(expected = "Already voted")]
    fn double_vote_rejected() {
        let mut c = setup(200);
        ctx(accounts(1), 10 * ONE_NEAR);
        c.invest("p1".into());
        ctx(accounts(0), 0);
        let pid = c.create_proposal("p1".into(), "approve_funding".into(), "Approve".into());
        ctx(accounts(1), 0);
        c.vote(pid.clone(), true);
        c.vote(pid, true);
    }

    #[test]
    #[should_panic(expected = "Only the owner")]
    fn non_owner_cannot_create_project() {
        let mut c = setup(200);
        ctx(accounts(1), 0);
        c.create_project("p2".into(), "x".into(), U128(1), 1);
    }
}
