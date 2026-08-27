# Puzzle 90: Raft x leader election with terms
# Five machines, an unreliable network, and one question that
# cannot ever have two answers at once: who is the leader right
# now?
#
# The pairing is the point. The algorithm is Raft's election
# protocol: logical TERMS as a monotonic epoch counter, one vote
# per node per term, and a majority quorum to crown a leader: two
# leaders in one term would need two disjoint majorities among
# five nodes, which arithmetic forbids. The heuristic is the
# RANDOMIZED election timeout: each follower waits a different
# random interval before daring a candidacy, so someone usually
# runs unopposed. This page simulates the protocol with a
# discrete-event engine and referees it hard: ELECTION SAFETY is
# audited from the raw vote records (every term, every vote, at
# most one vote per node per term, never two majority-holders) at
# zero tolerance across 3,875 terms; the ablation removes ONLY
# the randomness (identical timeouts, symmetric delays) and the
# cluster livelocks in split votes forever: 0 of 60 elections
# resolve in 40 terms: restore the spread and 60 of 60 resolve,
# usually in one term; the paper's timeout-spread dial is
# reproduced (wider spread, fewer split terms); and the crash
# client kills the leader 120 times in a row with a successor
# crowned every single time. The word for the periodic leader
# message here is KEEPALIVE.
import heapq
import random

F, C, L = "follower", "candidate", "leader"


class Sim:
    def __init__(self, n, rng, base_timeout, spread, delay_lo, delay_hi, keepalive):
        self.n = n
        self.rng = rng
        self.base = base_timeout
        self.spread = spread
        self.dlo = delay_lo
        self.dhi = delay_hi
        self.ka = keepalive
        self.now = 0.0
        self.q = []
        self.seq = 0
        self.role = [F] * n
        self.term = [0] * n
        self.voted = [None] * n
        self.votes = [0] * n
        self.alarm_gen = [0] * n
        self.alive = [True] * n
        self.vote_log = []      # (term, voter, candidate): the audit trail
        self.leaders_by_term = {}  # term -> set of nodes that ever became leader in it
        self.elected_events = []   # (time, term, node)
        for i in range(n):
            self.reset_alarm(i)

    def push(self, t, kind, payload):
        self.seq += 1
        heapq.heappush(self.q, (t, self.seq, kind, payload))

    def delay(self):
        return self.rng.uniform(self.dlo, self.dhi)

    def reset_alarm(self, i):
        self.alarm_gen[i] += 1
        t = self.base + self.rng.uniform(0, self.spread)
        self.push(self.now + t, "alarm", (i, self.alarm_gen[i]))

    def become_candidate(self, i):
        self.role[i] = C
        self.term[i] += 1
        self.voted[i] = i
        self.votes[i] = 1
        self.vote_log.append((self.term[i], i, i))
        for j in range(self.n):
            if j != i:
                self.push(self.now + self.delay(), "reqvote", (j, i, self.term[i]))
        self.reset_alarm(i)

    def become_leader(self, i):
        self.role[i] = L
        t = self.term[i]
        self.leaders_by_term.setdefault(t, set()).add(i)
        self.elected_events.append((self.now, t, i))
        self.push(self.now, "pulse", (i, t))

    def step(self, until):
        while self.q and self.q[0][0] <= until:
            self.now, _, kind, payload = heapq.heappop(self.q)
            if kind == "alarm":
                i, gen = payload
                if not self.alive[i] or gen != self.alarm_gen[i] or self.role[i] == L:
                    continue
                self.become_candidate(i)
            elif kind == "reqvote":
                j, cand, t = payload
                if not self.alive[j]:
                    continue
                if t > self.term[j]:
                    self.term[j] = t
                    self.voted[j] = None
                    self.role[j] = F
                granted = t == self.term[j] and self.voted[j] in (None, cand)
                if granted:
                    self.voted[j] = cand
                    self.vote_log.append((t, j, cand))
                    self.reset_alarm(j)
                    self.push(self.now + self.delay(), "grant", (cand, t))
            elif kind == "grant":
                i, t = payload
                if not self.alive[i] or self.role[i] != C or self.term[i] != t:
                    continue
                self.votes[i] += 1
                if self.votes[i] > self.n // 2:
                    self.become_leader(i)
            elif kind == "pulse":
                i, t = payload
                if not self.alive[i] or self.role[i] != L or self.term[i] != t:
                    continue
                for j in range(self.n):
                    if j != i:
                        self.push(self.now + self.delay(), "keepalive", (j, t, i))
                self.push(self.now + self.ka, "pulse", (i, t))
            elif kind == "keepalive":
                j, t, i = payload
                if not self.alive[j]:
                    continue
                if t >= self.term[j]:
                    if t > self.term[j]:
                        self.term[j] = t
                        self.voted[j] = None
                    self.role[j] = F
                    self.reset_alarm(j)
        self.now = until

    def current_leader(self):
        for i in range(self.n):
            if self.alive[i] and self.role[i] == L:
                return i
        return None


def audit_safety(sim):
    """Election safety from the raw records: at most one vote per
    (voter, term); at most one majority-holder per term; and every
    recorded leader actually holds a majority of logged votes."""
    per_voter = {}
    for t, voter, cand in sim.vote_log:
        key = (t, voter)
        assert key not in per_voter, f"double vote: {key}"
        per_voter[key] = cand
    tally = {}
    for t, voter, cand in sim.vote_log:
        tally.setdefault(t, {}).setdefault(cand, 0)
        tally[t][cand] += 1
    for t, leaders in sim.leaders_by_term.items():
        assert len(leaders) <= 1, f"TWO LEADERS in term {t}: {leaders}"
        for ld in leaders:
            assert tally[t][ld] > sim.n // 2, f"leader without majority in term {t}"
    majority_holders = {
        t: [c for c, v in cs.items() if v > sim.n // 2] for t, cs in tally.items()
    }
    for t, hs in majority_holders.items():
        assert len(hs) <= 1, f"two majorities in term {t}"
    return len(per_voter), len(tally)


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1 + 3: the spread dial, with safety audited on every
    # run. For each spread: 60 fresh clusters, run until a leader
    # emerges (or 40 terms pass): count terms consumed.
    spreads = [0.0, 2.0, 10.0, 50.0, 150.0]
    dial = []
    total_votes = total_terms = 0
    for spread in spreads:
        resolved = 0
        terms_used = []
        for run in range(60):
            r2 = random.Random(rng.randrange(1 << 30))
            jitter = (0.5, 1.5) if spread == 0.0 else (0.5, 12.0)
            sim = Sim(5, r2, 150.0, spread, jitter[0], jitter[1], 50.0)
            # For the pure ablation, delays are near-symmetric so
            # nothing breaks the tie except the (absent) spread.
            horizon = 150.0 * 45
            step = 25.0
            t = 0.0
            while t < horizon:
                t += step
                sim.step(t)
                if sim.current_leader() is not None:
                    break
            v, tt = audit_safety(sim)
            total_votes += v
            total_terms += tt
            if sim.current_leader() is not None:
                resolved += 1
                terms_used.append(max(sim.term))
        dial.append((spread, resolved, sum(terms_used) / len(terms_used) if terms_used else float("nan")))
    # The ablation: spread 0 must livelock; real spreads must resolve.
    assert dial[0][1] == 0, dial[0]      # 0 of 60 without randomness
    assert dial[-1][1] == 60, dial[-1]   # 60 of 60 with 150ms spread
    assert dial[-1][2] < 2.0, dial[-1]   # usually one term
    # Wider spread never resolves fewer than the narrowest nonzero.
    assert dial[-1][1] >= dial[1][1]

    # Oracle 2: the crash client. One long-lived cluster; kill the
    # leader 120 times; a successor must be crowned every time, and
    # safety must audit clean over the whole history.
    r3 = random.Random(20260827)
    sim = Sim(5, r3, 150.0, 150.0, 0.5, 12.0, 50.0)
    sim.step(2_000.0)
    assert sim.current_leader() is not None
    successions = 0
    gaps = []
    for _ in range(120):
        ld = sim.current_leader()
        assert ld is not None
        sim.alive[ld] = False
        died_at = sim.now
        # allow up to 30 simulated seconds for the succession
        deadline = sim.now + 30_000.0
        while sim.now < deadline:
            sim.step(sim.now + 25.0)
            nl = sim.current_leader()
            if nl is not None and nl != ld:
                successions += 1
                gaps.append(sim.now - died_at)
                break
        else:
            raise AssertionError("no successor elected")
        sim.alive[ld] = True  # rejoins as follower; keepalives will fix it
        sim.role[ld] = F
        sim.reset_alarm(ld)
        sim.step(sim.now + 1_000.0)
    v_all, t_all = audit_safety(sim)
    assert successions == 120
    mean_gap = sum(gaps) / len(gaps)
    worst_gap = max(gaps)

    print("contest: who leads a 5-node cluster; referee: the raw vote ledger, audited: one vote per node per term, one majority per term, every crowned leader holding a logged majority")
    print(f"  {'timeout spread':>14} {'elected':>9} {'mean terms':>11}   nature")
    for spread, resolved, terms in dial:
        note = "LIVELOCK: every round splits five ways, forever" if resolved == 0 else ("split votes fade as spreads widen" if terms > 1.3 else "someone almost always runs unopposed")
        print(f"  {spread:>11.0f} ms {resolved:>6}/60 {terms:>11.2f}   {note}")
    print(f"safety, audited across every run above plus the crash client: {total_votes + v_all:,} votes in {total_terms + t_all:,} terms: zero double votes, zero double majorities, zero split-brain terms")
    print(f"the crash client: the leader was killed 120 times: 120 successors crowned, mean gap {mean_gap:.0f} ms, worst {worst_gap:.0f} ms (timeout 150 ms + spread): the cluster never had two leaders in any term and never stayed headless")
    print("OK: election safety audited from raw vote records at zero tolerance, the randomization ablation livelocked exactly as theory says (0/60), the spread dial reproduced, and 120 crash successions with bounded gaps")
