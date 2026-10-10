# Puzzle 189: Vickrey auction x Second-price rule
# Truthful single-item auction: sell one item to one of n bidders who each
# privately value it, so that nobody gains by lying about their value, the
# item goes to whoever values it most, and the seller still earns a known
# revenue. The algorithm is the sealed-bid auction: collect one bid from
# each bidder, award the item to the highest bid. The heuristic is the
# second-price rule (Vickrey 1961): the winner pays the SECOND-highest bid,
# not their own. Then your bid decides only whether you win, never what you
# pay, so bidding your true value is a dominant strategy: no other bid does
# better against any bids the others might make. The ascending (English)
# auction reaches the same outcome one increment at a time, eBay's proxy
# bidding is this rule with a clock, and the VCG mechanism generalizes the
# "pay the harm you cause others" idea to combinatorial sales.
#
# Referees:
# (1) DOMINANT STRATEGY, exhaustively: on a value grid of 0 to 20 against
#     every possible highest competing bid and every possible deviation,
#     and on 20,000 random continuous profiles with a fine deviation grid,
#     truthful bidding never earns less than any deviation (ties split);
# (2) FIRST-PRICE IS NOT TRUTHFUL, measured: against n - 1 rivals bidding
#     the symmetric equilibrium (n - 1) v / n, a bidder's best reply on a
#     fine grid is the same shading, and bidding one's true value earns
#     strictly less; the equilibrium check is a best-response computation,
#     not an assumption;
# (3) REVENUE EQUIVALENCE, measured by simulation with standard errors:
#     Vickrey's expected revenue and first-price's at equilibrium both
#     equal (n - 1) / (n + 1) for i.i.d. uniform values (Vickrey 1961,
#     Myerson 1981), and an ascending clock auction with increment 0.001
#     reproduces Vickrey's allocation on every draw and its price within
#     one increment;
# (4) MYERSON'S RESERVE: for uniform values the revenue-optimal reserve is
#     1/2 (where the virtual value 2 v - 1 crosses zero); the closed-form
#     revenue 1/3 + r^2 - 4 r^3 / 3 for two bidders is maximized on a fine
#     grid at 0.500, and the simulated revenue at reserves 0, 0.3, 0.5, 0.7
#     matches it within three standard errors;
# (5) EFFICIENCY AND THE NEGATIVE EXAMPLE, measured: Vickrey awards the
#     item to the highest value on 100% of draws whatever the bidders
#     believe; a first-price auction between bidders who shade differently
#     (one by half, one by a fifth) misallocates on a measured fraction of
#     draws and loses measured welfare; and a seller who can read the sealed
#     bids and insert a shill bid just under the winner extracts the whole
#     gap, E[v1 - v2] = 1 / (n + 1), which is why the rule needs a seller
#     who cannot see the bids and bidders who do not collude.
#
# AUTHOR CORRECTION: the draft stated the two-bidder optimal reserve adds a
# third to revenue. Measured against the closed form, the gain is from 1/3
# to 5/12, a quarter, and the page reports the fraction the formula gives.
import math
import random

SEED = 20261010


def vickrey(bids, reserve=0.0):
    """Returns (winner index or None, price). Ties go to the lowest index."""
    order = sorted(range(len(bids)), key=lambda i: (-bids[i], i))
    top = order[0]
    if bids[top] < reserve:
        return None, 0.0
    second = bids[order[1]] if len(order) > 1 else 0.0
    return top, max(second, reserve)


def first_price(bids):
    order = sorted(range(len(bids)), key=lambda i: (-bids[i], i))
    return order[0], bids[order[0]]


def ascending_clock(values, increment):
    """English auction with a rising clock: every bidder stays in while the
    price is below their value; the last one standing pays the price at
    which the second-to-last dropped. Returns (winner, price, rounds)."""
    active = list(range(len(values)))
    price = 0.0
    rounds = 0
    while len(active) > 1:
        price += increment
        rounds += 1
        active = [i for i in active if values[i] >= price]
        if not active:
            # everyone dropped at once: the highest values tie just below price
            price -= increment
            active = [i for i in range(len(values)) if values[i] >= price]
            break
    winner = min(active, key=lambda i: (-values[i], i))
    return winner, price, rounds


def utility_second_price(value, bid, highest_other):
    """Expected payoff with a fair coin on ties."""
    if bid > highest_other:
        return value - highest_other
    if bid == highest_other:
        return 0.5 * (value - highest_other)
    return 0.0


def utility_first_price(value, bid, highest_other):
    if bid > highest_other:
        return value - bid
    if bid == highest_other:
        return 0.5 * (value - bid)
    return 0.0


def first_price_expected_utility(value, bid, n):
    """Against n - 1 rivals with uniform [0, 1] values bidding (n - 1) v / n:
    a rival's bid is below b when its value is below b n / (n - 1)."""
    p_each = min(1.0, bid * n / (n - 1))
    return (value - bid) * p_each ** (n - 1)


def reserve_revenue_closed_form(r):
    """Two bidders, uniform values, second-price with reserve r."""
    return 1 / 3 + r * r - 4 * r ** 3 / 3


def mean_se(xs):
    m = sum(xs) / len(xs)
    var = sum((x - m) ** 2 for x in xs) / (len(xs) - 1)
    return m, math.sqrt(var / len(xs))


def main():
    rng = random.Random(SEED)

    # Oracle 1: dominant strategy, exhaustive on the grid.
    grid = [k / 20 for k in range(21)]
    checks = 0
    violations = 0
    for v in grid:
        for m in grid:  # the highest competing bid
            truthful = utility_second_price(v, v, m)
            for b in grid:
                checks += 1
                if utility_second_price(v, b, m) > truthful + 1e-12:
                    violations += 1
    assert violations == 0, violations
    # and on random continuous profiles with a fine deviation grid
    fine = [k / 200 for k in range(201)]
    random_checks = 0
    for _ in range(20000):
        v = rng.random()
        m = max(rng.random() for _ in range(2))
        truthful = utility_second_price(v, v, m)
        for b in fine:
            random_checks += 1
            assert utility_second_price(v, b, m) <= truthful + 1e-12
    # the same test shows first-price bidding is manipulable: for a value v
    # and known highest rival bid m < v, bidding just above m beats bidding v
    fp_profitable = 0
    for v in grid:
        for m in grid:
            if m < v:
                best = max(utility_first_price(v, b, m) for b in grid)
                if best > utility_first_price(v, v, m) + 1e-12:
                    fp_profitable += 1
    assert fp_profitable > 0

    # Oracle 2: first-price equilibrium by best response.
    br_errors = []
    fp_truthful_loss = []
    for n in (2, 3, 5):
        for v in (0.2, 0.5, 0.8, 1.0):
            bids = [k / 1000 for k in range(0, 1001)]
            best_bid = max(bids, key=lambda b: first_price_expected_utility(v, b, n))
            br_errors.append(abs(best_bid - (n - 1) * v / n))
            u_eq = first_price_expected_utility(v, (n - 1) * v / n, n)
            u_truth = first_price_expected_utility(v, v, n)
            fp_truthful_loss.append(u_eq - u_truth)
            assert u_truth == 0.0  # bidding the value in a first-price auction earns nothing
    assert max(br_errors) <= 0.002, max(br_errors)

    # Oracle 3: revenue equivalence and the clock auction.
    draws = 60000
    rev_table = {}
    clock_mismatch = 0
    clock_price_gap = 0.0
    clock_rounds = 0
    for n in (2, 3, 5):
        v_rev, f_rev, highest_won = [], [], 0
        for _ in range(draws):
            values = [rng.random() for _ in range(n)]
            w, price = vickrey(values)
            assert values[w] == max(values)
            highest_won += 1
            v_rev.append(price)
            fw, fprice = first_price([(n - 1) * x / n for x in values])
            assert fw == w
            f_rev.append(fprice)
        vm, vse = mean_se(v_rev)
        fm, fse = mean_se(f_rev)
        theory = (n - 1) / (n + 1)
        assert abs(vm - theory) < 3 * vse and abs(fm - theory) < 3 * fse, (n, vm, fm, theory)
        assert abs(vm - fm) < 3 * math.hypot(vse, fse)
        rev_table[n] = (vm, vse, fm, fse, theory, highest_won)
    increment = 0.001
    for _ in range(3000):
        values = [rng.random() for _ in range(3)]
        w, price = vickrey(values)
        cw, cprice, rounds = ascending_clock(values, increment)
        clock_rounds += rounds
        if cw != w:
            clock_mismatch += 1
        clock_price_gap = max(clock_price_gap, abs(cprice - price))
    assert clock_mismatch == 0 and clock_price_gap <= increment + 1e-12, (clock_mismatch, clock_price_gap)

    # Oracle 4: Myerson's reserve.
    fine_r = [k / 1000 for k in range(1001)]
    best_r = max(fine_r, key=reserve_revenue_closed_form)
    assert abs(best_r - 0.5) <= 0.001, best_r
    reserve_rows = []
    for r in (0.0, 0.3, 0.5, 0.7):
        revs = []
        unsold = 0
        for _ in range(draws):
            values = [rng.random(), rng.random()]
            w, price = vickrey(values, reserve=r)
            if w is None:
                unsold += 1
            revs.append(price)
        m, se = mean_se(revs)
        cf = reserve_revenue_closed_form(r)
        assert abs(m - cf) < 3 * se, (r, m, cf, se)
        reserve_rows.append((r, m, se, cf, unsold / draws))
    assert reserve_rows[2][1] == max(row[1] for row in reserve_rows)

    # Oracle 5: efficiency under heterogeneous beliefs, and the shill.
    misallocated = 0
    welfare_loss = 0.0
    welfare_total = 0.0
    for _ in range(draws):
        va, vb = rng.random(), rng.random()
        # first price with different shading habits: A bids half, B bids four fifths
        winner_fp = 0 if 0.5 * va > 0.8 * vb else 1
        efficient = 0 if va > vb else 1
        welfare_total += max(va, vb)
        if winner_fp != efficient:
            misallocated += 1
            welfare_loss += max(va, vb) - (va if winner_fp == 0 else vb)
        w, _ = vickrey([va, vb])
        assert w == efficient
    shill_gain = []
    for _ in range(draws):
        values = sorted((rng.random() for _ in range(3)), reverse=True)
        honest_price = values[1]
        shill_price = values[0] - 1e-9  # the seller slips a bid just under the winner
        shill_gain.append(shill_price - honest_price)
    sg, sg_se = mean_se(shill_gain)
    assert abs(sg - 0.25) < 3 * sg_se, (sg, sg_se)  # E[v1 - v2] = 1 / (n + 1) with n = 3

    print('contest: one item, n bidders with i.i.d. uniform values; referees: exhaustive deviation checks on a value grid and 20,000 random profiles, a best-response computation for the first-price equilibrium, closed-form revenues (n - 1) / (n + 1) and 1/3 + r^2 - 4 r^3 / 3, and simulations of 60,000 draws with standard errors')
    print(f'truthfulness: {checks:,} grid deviations and {random_checks:,} random-profile deviations, 0 profitable under the second-price rule; under first-price pricing, {fp_profitable} of the grid (value, rival) cells reward shading')
    print('first-price best reply against rivals bidding (n - 1) v / n: largest gap from (n - 1) v / n over n = 2, 3, 5 and four values is ' + f'{max(br_errors):.4f}; bidding the true value earns 0 in every case (equilibrium utility {sum(fp_truthful_loss) / len(fp_truthful_loss):.3f} on average)')
    print(f'{"n":>2} {"Vickrey revenue":>16} {"first-price (eq.)":>18} {"(n-1)/(n+1)":>11} {"item to highest":>15}')
    for n, (vm, vse, fm, fse, th, hw) in rev_table.items():
        print(f'{n:>2} {vm:>9.4f} +/- {vse:.4f} {fm:>11.4f} +/- {fse:.4f} {th:>11.4f} {hw:>8,} of {draws:,}')
    print(f'ascending clock (increment {increment}): same winner as Vickrey on 3,000 of 3,000 draws, price within {clock_price_gap:.3f}, {clock_rounds / 3000:.0f} rounds per auction on average')
    print('reserve price, two bidders: ' + '; '.join(f'r = {r:.1f}: revenue {m:.4f} +/- {se:.4f} (formula {cf:.4f}), unsold {u:.1%}' for r, m, se, cf, u in reserve_rows) + f'; the formula peaks at r = {best_r:.3f}')
    print(f'efficiency: Vickrey awards the highest value on 100% of draws; first-price with one bidder shading by half and one by a fifth misallocates {misallocated / draws:.1%} of the time and loses {welfare_loss / welfare_total:.1%} of welfare')
    print(f'the shill: a seller who reads the bids and bids just under the winner gains {sg:.4f} +/- {sg_se:.4f} per sale (theory 1/(n+1) = 0.25 at n = 3), the whole gap between first and second value')
    print(f'OK: 0 profitable deviations in {checks + random_checks:,} checks; first-price best replies within {max(br_errors):.3f} of (n - 1) v / n; Vickrey and equilibrium first-price revenues equal (n - 1)/(n + 1) within three standard errors at n = 2, 3, 5; '
          f'the clock auction matches on 3,000 draws; the reserve 0.5 maximizes two-bidder revenue at {reserve_rows[2][1]:.4f} (formula {reserve_revenue_closed_form(0.5):.4f}); heterogeneous first-price shading misallocates {misallocated / draws:.1%}; a shill extracts {sg:.3f} per sale')


if __name__ == '__main__':
    main()
