# Puzzle 94: Tomasulo's algorithm x reservation stations with
# register renaming
# One instruction stream, multiple slow arithmetic units, and
# dependencies everywhere: run instructions the moment their DATA
# is ready, not the moment their turn comes: while keeping the
# results indistinguishable from perfect program order.
#
# The pairing is the point. The algorithm is Tomasulo's machine
# from the IBM 360/91 (1967): issue in order into reservation
# stations; execute when both operands arrive; broadcast every
# result on a common data bus that all waiting stations snoop.
# The heuristic is register renaming: a register file entry holds
# either a value or a TAG naming the station that will produce it,
# so an instruction waits on the producing STATION, never on the
# register name: WAW and WAR hazards, artifacts of having too few
# names, simply vanish. The referees: (1) EXACT result
# equivalence: the out-of-order machine's final registers equal a
# sequential interpreter's on 300 random dependency-heavy
# programs: reordering must be invisible; (2) the dataflow bound:
# measured cycles never beat the critical path through the
# dependency DAG or the 1-wide issue bound, sitting at 1.79x the
# combined bound on average: the honest plumbing tax; (3) THE RENAMING
# ABLATION: the same out-of-order machine with renaming disabled
# (issue stalls on WAW and WAR name conflicts) pays 1.63x the
# cycles on name-starved code, and on the client loop LOSES to
# plain serial execution outright; (4) the serial baseline is
# beaten 1.71x on the client loop. Every
# number is a counted cycle from a deterministic simulation.
import random

LAT = {"add": 2, "sub": 2, "mul": 10, "div": 20}
N_REG = 8


def run_sequential(prog, regs0):
    regs = list(regs0)
    for dst, op, s1, s2 in prog:
        a, b = regs[s1], regs[s2]
        if op == "add":
            regs[dst] = (a + b) % 10**9
        elif op == "sub":
            regs[dst] = (a - b) % 10**9
        elif op == "mul":
            regs[dst] = (a * b) % 10**9
        else:
            regs[dst] = (a * 7 + b * 3 + 1) % 10**9  # a stand-in "div"
    return regs


def apply_op(op, a, b):
    if op == "add":
        return (a + b) % 10**9
    if op == "sub":
        return (a - b) % 10**9
    if op == "mul":
        return (a * b) % 10**9
    return (a * 7 + b * 3 + 1) % 10**9


def run_tomasulo(prog, regs0, n_add_rs=3, n_mul_rs=2, renaming=True):
    """Cycle-accurate-enough simulation: in-order issue into RS,
    execute when operands ready, one CDB broadcast per cycle
    (oldest-finished first). Without renaming, issue additionally
    stalls while the destination has an in-flight writer (WAW) or
    an earlier in-flight instruction still needs to READ the
    destination register (WAR)."""
    regs = list(regs0)
    tag_of = [None] * N_REG          # register -> producing station id
    stations = {}                    # sid -> dict
    sid_counter = [0]
    pc = 0
    cycle = 0
    issued_order = []
    inflight_reads = []              # (sid, src_regs) for WAR checks

    def rs_free(op):
        pool = "mul" if op in ("mul", "div") else "add"
        cap = n_mul_rs if pool == "mul" else n_add_rs
        used = sum(1 for s in stations.values() if s["pool"] == pool)
        return used < cap

    while pc < len(prog) or stations:
        cycle += 1
        if cycle > 200_000:
            raise RuntimeError("runaway")
        # 1) CDB: broadcast the oldest finished result.
        finished = [s for s in stations.values() if s["state"] == "exec" and s["done_at"] <= cycle]
        finished.sort(key=lambda s: s["order"])
        if finished:
            w = finished[0]
            val = apply_op(w["op"], w["v1"], w["v2"])
            for s in stations.values():
                if s["q1"] == w["id"]:
                    s["q1"] = None
                    s["v1"] = val
                if s["q2"] == w["id"]:
                    s["q2"] = None
                    s["v2"] = val
            if tag_of[w["dst"]] == w["id"]:
                regs[w["dst"]] = val
                tag_of[w["dst"]] = None
            del stations[w["id"]]
        # 2) start execution where operands are ready (all units pipelined).
        for s in stations.values():
            if s["state"] == "wait" and s["q1"] is None and s["q2"] is None:
                s["state"] = "exec"
                s["done_at"] = cycle + LAT[s["op"]]
        # 3) in-order issue (one per cycle).
        if pc < len(prog):
            dst, op, s1, s2 = prog[pc]
            can = rs_free(op)
            if can and not renaming:
                # WAW: someone in flight writes dst. WAR: an earlier
                # in-flight instruction reads dst.
                if tag_of[dst] is not None:
                    can = False
                if any(dst in srcs for _, srcs in inflight_reads):
                    can = False
            if can:
                sid_counter[0] += 1
                sid = sid_counter[0]
                st = {"id": sid, "order": pc, "op": op, "dst": dst,
                      "pool": "mul" if op in ("mul", "div") else "add",
                      "state": "wait", "done_at": None}
                st["q1"], st["v1"] = (tag_of[s1], None) if tag_of[s1] is not None else (None, regs[s1])
                st["q2"], st["v2"] = (tag_of[s2], None) if tag_of[s2] is not None else (None, regs[s2])
                tag_of[dst] = sid
                stations[sid] = st
                inflight_reads.append((sid, (s1, s2)))
                issued_order.append(sid)
                pc += 1
        inflight_reads = [(sid, srcs) for sid, srcs in inflight_reads if sid in stations]
    return regs, cycle


def critical_path(prog):
    """Longest latency-weighted chain through the dataflow DAG
    (true RAW dependencies only: renaming's ideal world)."""
    last_writer = [None] * N_REG
    depth = []
    for i, (dst, op, s1, s2) in enumerate(prog):
        d = 0
        for s in (s1, s2):
            w = last_writer[s]
            if w is not None:
                d = max(d, depth[w])
        d += LAT[op]
        depth.append(d)
        last_writer[dst] = i
    return max(depth) if depth else 0


def random_program(rng, n, name_pressure=False):
    prog = []
    for _ in range(n):
        if name_pressure:
            dst = rng.randrange(3)  # few names: WAW/WAR storms
        else:
            dst = rng.randrange(N_REG)
        op = rng.choice(["add", "add", "sub", "mul", "mul", "div"])
        prog.append((dst, op, rng.randrange(N_REG), rng.randrange(N_REG)))
    return prog


if __name__ == "__main__":
    rng = random.Random(20260827)

    # Oracle 1: reordering must be invisible. 300 dependency-heavy
    # programs: final registers equal the sequential interpreter's,
    # with and without renaming.
    cp_ratios = []
    for _ in range(300):
        n = rng.randint(4, 30)
        prog = random_program(rng, n, name_pressure=rng.random() < 0.5)
        regs0 = [rng.randrange(100) for _ in range(N_REG)]
        want = run_sequential(prog, regs0)
        got, cyc = run_tomasulo(prog, regs0)
        assert got == want, (prog, got, want)
        got2, cyc2 = run_tomasulo(prog, regs0, renaming=False)
        assert got2 == want
        assert cyc2 >= cyc  # renaming never hurts
        cp = critical_path(prog)
        assert cyc >= cp  # nobody beats the dataflow
        # The machine's own structure bounds it too: issue is
        # 1-wide (n cycles to issue n instructions) and the CDB
        # broadcasts one result per cycle. The honest lower bound
        # is the max of the program's physics and the machine's.
        lb = max(cp, n + 2)
        assert cyc >= lb
        cp_ratios.append(cyc / lb)
    mean_cp = sum(cp_ratios) / len(cp_ratios)
    # The gap above the bound is the machine's plumbing: issue,
    # wakeup, and broadcast each cost a cycle per dependency hop,
    # and 5 stations sometimes fill. Honest overhead, measured.
    assert mean_cp < 2.2, mean_cp  # measured 1.79

    # Oracle 2: THE RENAMING ABLATION on name-starved code: same
    # machine, renaming off, WAW/WAR stalls on: measured cycles.
    rename_win = []
    for _ in range(60):
        prog = random_program(rng, 24, name_pressure=True)
        regs0 = [rng.randrange(100) for _ in range(N_REG)]
        _, c_on = run_tomasulo(prog, regs0, renaming=True)
        _, c_off = run_tomasulo(prog, regs0, renaming=False)
        rename_win.append(c_off / c_on)
    mean_win = sum(rename_win) / len(rename_win)
    assert mean_win > 1.25, mean_win  # measured 1.63x

    # Oracle 3: the client. An unrolled a*x+b vector loop: four
    # independent (mul, add) pairs sharing one accumulator chain:
    # the textbook case where adds hide under multiplies.
    client = [
        (1, "mul", 0, 2), (1, "add", 1, 3),
        (4, "mul", 0, 5), (4, "add", 4, 3),
        (6, "mul", 0, 7), (6, "add", 6, 3),
        (2, "mul", 0, 2), (2, "add", 2, 3),
    ]
    regs0 = [3, 10, 20, 5, 30, 40, 50, 60]
    want = run_sequential(client, regs0)
    got, c_ooo = run_tomasulo(client, regs0)
    assert got == want
    serial = sum(LAT[op] for _, op, _, _ in client)
    _, c_norename = run_tomasulo(client, regs0, renaming=False)
    cp_client = critical_path(client)
    speedup = serial / c_ooo
    assert speedup > 1.5, speedup  # measured 1.71x
    # The twist worth keeping: without renaming, the out-of-order
    # machinery LOSES to plain serial execution on this loop: the
    # WAW/WAR stalls plus the plumbing cost more than they save.
    assert c_norename > serial, (c_norename, serial)

    print("contest: 8 dependent multiply-add pairs on 3 adders + 2 multipliers; referee: a sequential interpreter (results equal, exactly) and the dataflow critical path (cycles never below it)")
    print(f"  {'machine':<26} {'cycles':>7}   nature")
    print(f"  {'Serial (sum of latencies)':<26} {serial:>7}   one instruction at a time")
    print(f"  {'OoO, renaming OFF':<26} {c_norename:>7}   WORSE than serial: name stalls + plumbing cost more than they save")
    print(f"  {'Tomasulo (this unit)':<26} {c_ooo:>7}   {speedup:.2f}x over serial: adds hide under multiplies (critical path {cp_client})")
    print(f"result equivalence: 300 random dependency-heavy programs (half name-starved): out-of-order finals == sequential finals, every register, every time: reordering is invisible")
    print(f"the dataflow bound: cycles / max(critical path, issue bound) averaged {mean_cp:.2f} across 300 programs and never dipped below 1.0: the gap above 1 is the plumbing tax (issue, wakeup, and broadcast each cost a cycle per hop, and five stations sometimes fill)")
    print(f"the renaming ablation: same machine, renaming disabled, on name-starved code: {mean_win:.2f}x the cycles on average over 60 programs: WAW and WAR were never real dependencies: only a shortage of names")
    print(f"OK: 300 programs bit-equal to sequential execution both with and without renaming, the combined lower bound respected (mean {mean_cp:.2f}x, never under 1.0), the renaming dividend {mean_win:.2f}x, the client {speedup:.2f}x over serial, and no-rename OoO measurably losing to serial itself")
