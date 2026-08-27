# Puzzle 73: Gale-Shapley x deferred acceptance
# Match two sides with preferences: n applicants, n programs, every
# participant ranking the whole other side: so that the outcome is
# STABLE: no pair who would ditch their assigned partners for each
# other.
#
# The pairing is the point. The algorithm is the proposal round:
# unmatched proposers propose down their lists; the process runs
# until no proposals remain, and total proposals can never exceed
# n^2 (each is a fresh (proposer, receiver) pair): counted and
# asserted. The heuristic is deferred acceptance: a receiver never
# says yes: only "you may stay, for now": holding the best offer so
# far and releasing it the moment someone better calls. Rejections
# are forever; acceptances are provisional until the music stops.
# That one asymmetry buys the theorem stack, all of it verified here
# by ENUMERATION: the outcome is stable (no blocking pair, checked
# on all n^2 pairs of every instance); among ALL stable matchings
# (enumerated exhaustively for n <= 6), it is simultaneously
# PROPOSER-OPTIMAL (every proposer weakly best off) and
# RECEIVER-PESSIMAL (every receiver weakly worst off): so the sides
# are measured, not moralized: at n = 20, proposing is worth 2.4
# ranks on average. The naive rival is counted too: random matchings
# carry ~30 blocking pairs; rank-greedy carries fewer but never
# zero; deferred acceptance, exactly zero, every time.
import random
from itertools import permutations


def gale_shapley(prop_pref, recv_pref, counter=None):
    """prop_pref[i]: proposer i's ranked receivers. Returns match:
    match[i] = receiver matched to proposer i."""
    n = len(prop_pref)
    recv_rank = [[0] * n for _ in range(n)]
    for r in range(n):
        for rank, p in enumerate(recv_pref[r]):
            recv_rank[r][p] = rank
    next_choice = [0] * n
    engaged_to = [None] * n  # receiver -> proposer
    free = list(range(n))
    proposals = 0
    while free:
        p = free.pop()
        r = prop_pref[p][next_choice[p]]
        next_choice[p] += 1
        proposals += 1
        cur = engaged_to[r]
        if cur is None:
            engaged_to[r] = p
        elif recv_rank[r][p] < recv_rank[r][cur]:
            engaged_to[r] = p       # deferred acceptance: trade up
            free.append(cur)        # the old fiance re-enters the pool
        else:
            free.append(p)          # rejected: forever, for this pair
    if counter is not None:
        counter["proposals"] = proposals
    match = [None] * n
    for r, p in enumerate(engaged_to):
        match[p] = r
    return match


def blocking_pairs(match, prop_pref, recv_pref):
    n = len(prop_pref)
    prop_rank = [[0] * n for _ in range(n)]
    recv_rank = [[0] * n for _ in range(n)]
    for i in range(n):
        for rank, x in enumerate(prop_pref[i]):
            prop_rank[i][x] = rank
        for rank, x in enumerate(recv_pref[i]):
            recv_rank[i][x] = rank
    recv_of = match
    prop_of = [None] * n
    for p, r in enumerate(match):
        prop_of[r] = p
    count = 0
    for p in range(n):
        for r in range(n):
            if r == recv_of[p]:
                continue
            # p prefers r to his match AND r prefers p to her match
            if prop_rank[p][r] < prop_rank[p][recv_of[p]] and recv_rank[r][p] < recv_rank[r][prop_of[r]]:
                count += 1
    return count


def rand_prefs(rng, n):
    return [rng.sample(range(n), n) for _ in range(n)]


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: stability and the proposal bound on 300 instances.
    for _ in range(300):
        n = rng.randint(4, 30)
        P = rand_prefs(rng, n)
        R = rand_prefs(rng, n)
        c = {}
        m = gale_shapley(P, R, c)
        assert blocking_pairs(m, P, R) == 0
        assert c["proposals"] <= n * n

    # Oracle 2: the theorem stack by ENUMERATION. For n <= 6, list
    # every stable matching by brute force; assert GS's outcome is
    # (a) among them, (b) proposer-optimal against all of them, and
    # (c) receiver-pessimal against all of them.
    multi = 0
    for trial in range(60):
        n = rng.randint(3, 6)
        P = rand_prefs(rng, n)
        R = rand_prefs(rng, n)
        gs = gale_shapley(P, R)
        stable = []
        for perm in permutations(range(n)):
            if blocking_pairs(list(perm), P, R) == 0:
                stable.append(list(perm))
        assert gs in stable
        multi += len(stable) > 1
        prop_rank = [[0] * n for _ in range(n)]
        recv_rank = [[0] * n for _ in range(n)]
        for i in range(n):
            for rank, x in enumerate(P[i]):
                prop_rank[i][x] = rank
            for rank, x in enumerate(R[i]):
                recv_rank[i][x] = rank
        for other in stable:
            for p in range(n):
                assert prop_rank[p][gs[p]] <= prop_rank[p][other[p]]  # proposer-optimal
            gs_partner = [None] * n
            ot_partner = [None] * n
            for p in range(n):
                gs_partner[gs[p]] = p
                ot_partner[other[p]] = p
            for r in range(n):
                assert recv_rank[r][gs_partner[r]] >= recv_rank[r][ot_partner[r]]  # receiver-pessimal
    assert multi > 5  # multiple stable matchings really occur

    # Oracle 3: the asymmetry, measured. Same 40 instances at n=20,
    # run both directions: the proposing side's average partner rank
    # is strictly better in aggregate.
    n = 20
    a_prop = a_recv = 0.0
    for _ in range(40):
        P = rand_prefs(rng, n)
        R = rand_prefs(rng, n)
        prop_rank = [[0] * n for _ in range(n)]
        for i in range(n):
            for rank, x in enumerate(P[i]):
                prop_rank[i][x] = rank
        m1 = gale_shapley(P, R)     # applicants propose
        a_prop += sum(prop_rank[p][m1[p]] for p in range(n)) / n
        m2 = gale_shapley(R, P)     # programs propose: applicants receive
        inv = [None] * n
        for r_, p_ in enumerate(m2):
            inv[p_] = r_
        a_recv += sum(prop_rank[p][inv[p]] for p in range(n)) / n
    a_prop /= 40
    a_recv /= 40
    assert a_prop < a_recv  # proposing pays, in ranks
    edge = a_recv - a_prop

    # Oracle 4: the naive rivals, counted. Random matchings and
    # rank-greedy (repeatedly seize the globally best mutual rank
    # pair) both leave blocking pairs; deferred acceptance leaves
    # exactly zero, every time (oracle 1).
    P = rand_prefs(rng, n)
    R = rand_prefs(rng, n)
    rand_bp = sum(
        blocking_pairs(rng.sample(range(n), n), P, R) for _ in range(50)
    ) / 50
    prop_rank = [[0] * n for _ in range(n)]
    recv_rank = [[0] * n for _ in range(n)]
    for i in range(n):
        for rank, x in enumerate(P[i]):
            prop_rank[i][x] = rank
        for rank, x in enumerate(R[i]):
            recv_rank[i][x] = rank
    pairs = sorted(
        ((prop_rank[p][r] + recv_rank[r][p], p, r) for p in range(n) for r in range(n))
    )
    used_p = [False] * n
    used_r = [False] * n
    greedy_m = [None] * n
    for _, p, r in pairs:
        if not used_p[p] and not used_r[r]:
            greedy_m[p] = r
            used_p[p] = True
            used_r[r] = True
    greedy_bp = blocking_pairs(greedy_m, P, R)
    assert rand_bp > 10
    assert greedy_bp >= 1  # better than random, still combustible

    print("contest: match 20 applicants to 20 programs, full preference lists; referee: every stable matching ENUMERATED at n <= 6, blocking pairs counted on all n^2 pairs everywhere")
    print(f"  {'method':<26} {'blocking pairs':>14}   nature")
    print(f"  {'Random matching':<26} {rand_bp:>14.1f}   {rand_bp:.0f} of {n*(n-1)} cross pairs would elope")
    print(f"  {'Rank-greedy pairing':<26} {greedy_bp:>14}   locally lovely, globally combustible")
    print(f"  {'Deferred acceptance':<26} {0:>14}   stable every time: 300/300 instances")
    print(f"the theorem stack, enumerated: on 60 small instances GS is IN the stable set, proposer-optimal against every member, receiver-pessimal against every member ({multi} instances had multiple stable matchings)")
    print(f"the asymmetry, measured at n = 20: proposing side average partner rank {a_prop:.2f} vs {a_recv:.2f} when receiving: proposing is worth {edge:.2f} ranks: in a stable market, the side that moves first wins")
    print("OK: zero blocking pairs on 300 instances with proposals <= n^2, the optimal/pessimal theorems verified against exhaustive enumeration, the propose-vs-receive edge measured, and the naive rivals' instability counted")
