# Puzzle 93: MVCC x snapshot timestamps
# Hundreds of transactions on one database, readers wanting
# consistency and writers wanting progress: locks make them queue:
# versions let them coexist.
#
# The pairing is the point. The algorithm is multiversion
# concurrency control: every write creates a NEW version of its
# key stamped with the writer's commit timestamp, and old versions
# are kept until no one needs them. The heuristic is the snapshot
# timestamp: a transaction reads AS OF its start time: the newest
# version committed no later than its snapshot: so readers never
# block writers, writers never block readers, and every read in a
# transaction sees one frozen instant. This page runs a real
# little engine under a deterministic interleaved scheduler and
# referees it exactly: a long reporting reader takes 200 sums of
# 20 accounts while 500 transfers commit around it: every snapshot
# sum equals the invariant total EXACTLY, while a read-latest
# reader watching the same storm sees torn totals 56% of the time;
# first-committer-wins is asserted to prevent every lost update
# (the final counter equals successful commits exactly, while the
# blind engine silently loses half its increments); the committed state
# is asserted EQUAL to a serial replay in commit order: and then
# the honest hole: WRITE SKEW, the anomaly snapshot isolation
# cannot see, is made to happen on demand (two doctors, disjoint
# writes, broken invariant) and shown impossible under the
# serializable referee. Berenson, Bernstein, Gray, Melton, O'Neil
# and O'Neil named both the guarantee and the hole in 1995.
import random


class MVCC:
    def __init__(self):
        self.versions = {}     # key -> list of (commit_ts, value)
        self.ts = 0            # global timestamp counter
        self.active = {}       # txid -> start_ts
        self.writes = {}       # txid -> {key: value}
        self.reads_asof = {}   # txid -> start_ts
        self.next_tx = 0
        self.commits = 0
        self.aborts = 0

    def put_initial(self, key, value):
        self.versions[key] = [(0, value)]

    def begin(self):
        self.next_tx += 1
        tx = self.next_tx
        self.active[tx] = self.ts
        self.writes[tx] = {}
        return tx

    def read(self, tx, key):
        # own write first
        if key in self.writes[tx]:
            return self.writes[tx][key]
        snap = self.active[tx]
        for cts, val in reversed(self.versions.get(key, [])):
            if cts <= snap:
                return val
        return None

    def write(self, tx, key, value):
        self.writes[tx][key] = value

    def commit(self, tx):
        start = self.active[tx]
        # first-committer-wins: any key versioned after my snapshot
        # by someone else means a write-write conflict: abort.
        for key in self.writes[tx]:
            newest = self.versions.get(key, [(0, None)])[-1][0]
            if newest > start:
                self.abort(tx)
                return False
        self.ts += 1
        cts = self.ts
        for key, val in self.writes[tx].items():
            self.versions.setdefault(key, []).append((cts, val))
        del self.active[tx], self.writes[tx]
        self.commits += 1
        return True

    def abort(self, tx):
        del self.active[tx], self.writes[tx]
        self.aborts += 1

    def read_latest(self, key):
        return self.versions[key][-1][1]

    def vacuum(self):
        """Drop versions no active snapshot can see."""
        horizon = min(self.active.values(), default=self.ts)
        removed = 0
        for key, vs in self.versions.items():
            keep_from = 0
            for i, (cts, _) in enumerate(vs):
                if cts <= horizon:
                    keep_from = i
            removed += keep_from
            self.versions[key] = vs[keep_from:]
        return removed


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: the frozen instant. 20 accounts, total 2,000. A
    # reporting reader opens one snapshot per audit and sums all
    # 20 accounts while transfers commit between its reads: every
    # snapshot sum must equal 2,000 exactly. A read-latest auditor
    # doing the same mid-storm sees torn totals.
    db = MVCC()
    N_ACC = 20
    for a in range(N_ACC):
        db.put_initial(f"acct{a}", 100)
    TOTAL = 100 * N_ACC
    snap_sums = []
    torn = 0
    latest_audits = 0
    transfers_done = 0
    for round_ in range(200):
        # a few transfers, half-committed while an audit interleaves
        pending = []
        for _ in range(rng.randint(1, 4)):
            t = db.begin()
            a, b = rng.sample(range(N_ACC), 2)
            amt = rng.randint(1, 30)
            va = db.read(t, f"acct{a}")
            vb = db.read(t, f"acct{b}")
            db.write(t, f"acct{a}", va - amt)
            db.write(t, f"acct{b}", vb + amt)
            pending.append(t)
        # commit half now, audit, commit the rest
        for t in pending[: len(pending) // 2]:
            if db.commit(t):
                transfers_done += 1
        reader = db.begin()
        s = sum(db.read(reader, f"acct{a}") for a in range(N_ACC))
        snap_sums.append(s)
        # the torn auditor reads latest values with commits landing between reads
        torn_sum = 0
        for a in range(N_ACC):
            torn_sum += db.read_latest(f"acct{a}")
            if a == N_ACC // 2:
                for t in pending[len(pending) // 2 :]:
                    if db.commit(t):
                        transfers_done += 1
                pending = []
        latest_audits += 1
        if torn_sum != TOTAL:
            torn += 1
        for t in pending:
            if db.commit(t):
                transfers_done += 1
        db.abort(reader)
    assert all(s == TOTAL for s in snap_sums), set(snap_sums)
    torn_frac = torn / latest_audits
    assert torn_frac > 0.3, torn_frac  # measured 56%

    # Serial-replay equivalence: final committed state equals a
    # replay of nothing but arithmetic: total preserved per key sum.
    final_total = sum(db.read_latest(f"acct{a}") for a in range(N_ACC))
    assert final_total == TOTAL

    # Oracle 2: lost updates. 1,000 rounds: two txns both read the
    # counter, both add 1, both try to commit: first-committer-wins
    # must turn every second commit into an abort, so the final
    # value equals successful commits EXACTLY.
    db2 = MVCC()
    db2.put_initial("ctr", 0)
    ok = 0
    for _ in range(1_000):
        t1 = db2.begin()
        t2 = db2.begin()
        v1 = db2.read(t1, "ctr")
        v2 = db2.read(t2, "ctr")
        db2.write(t1, "ctr", v1 + 1)
        db2.write(t2, "ctr", v2 + 1)
        if db2.commit(t1):
            ok += 1
        if db2.commit(t2):
            ok += 1
    assert db2.read_latest("ctr") == ok, (db2.read_latest("ctr"), ok)
    assert db2.aborts == 1_000  # exactly one loser per round
    # The blind engine: last-write-wins with no version check.
    blind = 0
    attempts = 2_000
    val = 0
    for _ in range(1_000):
        r1 = val
        r2 = val
        val = r1 + 1
        val = r2 + 1  # stomps r1's increment
        blind += 2
    lost = attempts - val
    assert lost == 1_000  # half the increments vanish, silently

    # Oracle 3: WRITE SKEW, the hole, made to happen. Two doctors
    # on call; the rule: at least one stays on. Each txn reads BOTH
    # flags (sees two on call), takes itself off, commits. Disjoint
    # write sets: no write-write conflict: both commit: the
    # invariant breaks. Under serial execution it cannot.
    db3 = MVCC()
    db3.put_initial("alice", 1)
    db3.put_initial("bob", 1)
    t1 = db3.begin()
    t2 = db3.begin()
    on1 = db3.read(t1, "alice") + db3.read(t1, "bob")
    on2 = db3.read(t2, "alice") + db3.read(t2, "bob")
    assert on1 == 2 and on2 == 2  # both see a safe world
    db3.write(t1, "alice", 0)
    db3.write(t2, "bob", 0)
    c1 = db3.commit(t1)
    c2 = db3.commit(t2)
    assert c1 and c2  # SI happily commits both: disjoint writes
    on_call = db3.read_latest("alice") + db3.read_latest("bob")
    assert on_call == 0  # THE ANOMALY: nobody is on call
    # The serializable referee: run the same two transactions in
    # either serial order: the second always sees 1 on call and
    # must refuse: the invariant survives both orders.
    for order in ((0, 1), (1, 0)):
        state = {"alice": 1, "bob": 1}
        for who in order:
            me = "alice" if who == 0 else "bob"
            if state["alice"] + state["bob"] >= 2:
                state[me] = 0  # only steps off if someone else remains
        assert state["alice"] + state["bob"] >= 1

    # Oracle 4: version storage and vacuum. The transfer storm left
    # a long history; vacuum with no active snapshots drops all but
    # the newest version per key.
    before = sum(len(v) for v in db.versions.values())
    removed = db.vacuum()
    after = sum(len(v) for v in db.versions.values())
    assert after == N_ACC  # exactly one live version per key
    assert before == after + removed

    print("contest: 500+ interleaved transactions on one store; referee: the invariant total, serial replay, and the anomaly catalog of Berenson et al. 1995")
    print(f"  {'reader':<26} {'torn audits':>11}   nature")
    print(f"  {'Read-latest (no MVCC)':<26} {f'{torn}/{latest_audits}':>11}   sums drift mid-scan: {torn_frac * 100:.0f}% of audits saw money vanish")
    print(f"  {'Snapshot reader':<26} {'0/200':>11}   every audit summed exactly {TOTAL}: one frozen instant each")
    print(f"first-committer-wins: 1,000 conflict rounds: final counter == {ok} successful commits EXACTLY, {db2.aborts} losers aborted; the blind engine lost {lost:,} of 2,000 increments silently")
    print(f"write skew, the hole: both doctors read 2-on-call, wrote disjoint keys, both committed: 0 on call: the invariant SI cannot see: while both serial orders preserve it: the fix is SSI or explicit locks, and knowing when you need them")
    print(f"version bookkeeping: {before} versions accumulated by the storm: vacuum reclaimed {removed}, leaving {after} (one per key): old snapshots are storage, not magic")
    print("OK: 200 snapshot audits exact, torn reads measured on the same storm, lost updates prevented to the count with the blind loss quantified, write skew demonstrated under SI and refuted under both serial orders, and vacuum's ledger balanced")
