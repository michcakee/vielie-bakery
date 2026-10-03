import { useState } from 'react';
import { ECON } from '../../data/config';
import { ROLES, ROLE_ORDER } from '../../data/world';
import { laborTrays, ovenCapacity, productivity, trayCapacity, wages } from '../../engine/economy';
import { hireValue, marketWage } from '../../engine/labor';
import type { Employee, RoleId } from '../../engine/types';
import { money, money2 } from '../../lib/format';
import { useGame } from '../GameContext';
import { Btn, Card, Empty, Meter, Stepper, Tip } from '../kit';
import { Person, Sprite } from '../pixel/Sprite';

function EmployeeRow({ e }: { e: Employee }) {
  const { state: s, dispatch } = useGame();
  const [wage, setWage] = useState(e.wage);
  const going = marketWage(s, e.role, e.skill);
  const prod = productivity(e, s.day);
  const busy = s.phase === 'service';
  const branches = s.branches.filter((b) => !b.closed);
  return (
    <li className="staff-row">
      <Person look={e.look} scale={3} />
      <div className="staff-info">
        <b>
          {e.name} <span className="muted">· {ROLES[e.role].name}</span>
        </b>
        <span className="small">
          Skill {Array.from({ length: e.skill }).map((_, i) => (<span key={i} className="star-on"><Sprite name="star" scale={2} /></span>))}
          {Array.from({ length: 5 - e.skill }).map((_, i) => (<span key={i} className="star-off"><Sprite name="star" scale={2} /></span>))} · productivity {Math.round(prod * 100)}% · {e.served} served · since day {e.hiredDay}
        </span>
        <span className="small">Morale</span>
        <Meter value={e.morale / 100} tone={e.morale < 35 ? 'bad' : e.morale < 60 ? 'meh' : 'good'} label={`${e.name}'s morale`} />
        {e.trainingUntil >= s.day && <span className="small effect">In training until day {e.trainingUntil}</span>}
        <span className="small muted">
          Paid {money2(e.wage)}/hour ({money(e.wage * ECON.labor.hoursPerShift * (1 + ECON.labor.payrollOverhead))}/day with payroll costs). Going rate {money2(going)}/hour.
        </span>
      </div>
      <div className="staff-act">
        <Stepper value={wage} step={0.5} min={10} max={80} format={(v) => `$${v.toFixed(2)}`} label={`${e.name}'s hourly wage`} disabled={busy} onChange={setWage} />
        <Btn disabled={busy || wage === e.wage} onClick={() => dispatch({ type: 'setWage', id: e.id, wage })}>
          Set wage
        </Btn>
        <Btn kind="ghost" disabled={busy || e.skill >= 5 || e.trainingUntil >= s.day || s.cash < ECON.labor.trainingCost * s.macro.priceIndex} onClick={() => dispatch({ type: 'train', id: e.id })}>
          Train ({money(ECON.labor.trainingCost * s.macro.priceIndex)})
        </Btn>
        {branches.length > 0 && (
          <select aria-label={`Where ${e.name} works`} value={e.branch ?? 'home'} onChange={(ev) => dispatch({ type: 'assign', id: e.id, branch: ev.target.value === 'home' ? null : Number(ev.target.value) })} disabled={busy}>
            <option value="home">Main shop</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
        <Btn kind="danger" disabled={busy} onClick={() => dispatch({ type: 'fire', id: e.id })}>
          Let go
        </Btn>
      </div>
    </li>
  );
}

export function StaffPanel() {
  const { state: s, dispatch, business } = useGame();
  const [branch, setBranch] = useState<number | null>(null);
  const team = s.staff;
  const ovens = ovenCapacity(s);
  const people = laborTrays(s);
  const servers = team.filter((e) => e.branch === null && (e.role === 'cashier' || e.role === 'barista' || e.role === 'cook'));
  const recent = s.history.slice(-7);
  const lostSlow = recent.length ? recent.reduce((t, h) => t + h.lostSlow, 0) / recent.length : 0;
  const hireFee = Math.round(ECON.labor.hiringCost * s.macro.priceIndex);
  const branches = s.branches.filter((b) => !b.closed);

  return (
    <div className="panel-stack">
      <Card title="Capacity" icon="hot">
        <div className="capacity">
          <div>
            <span className="small">Ovens can bake</span>
            <b>{ovens} trays</b>
          </div>
          <div>
            <span className="small">Your team can prepare</span>
            <b>{people} trays</b>
          </div>
          <div>
            <span className="small">So each morning you get</span>
            <b className="big-num">{trayCapacity(s)} trays</b>
          </div>
        </div>
        <p className="small">
          {ovens < people ? (
            <>
              <b>Bottleneck: ovens.</b> More bakers won't help until you buy another oven (Growth tab).
            </>
          ) : ovens > people ? (
            <>
              <b>Bottleneck: people.</b> Your ovens have room for {ovens - people} more trays. A baker would use it.
            </>
          ) : (
            'Ovens and people are balanced.'
          )}{' '}
          At the counter you have {servers.length} helper{servers.length === 1 ? '' : 's'}; last week about {lostSlow.toFixed(1)} customers a day gave up waiting.
        </p>
        {business && (
          <p className="small muted">
            Daily payroll {money(wages(s))} · market unemployment {(s.macro.unemployment * 100).toFixed(1)}% ({s.macro.unemployment > 0.06 ? 'easy to hire, wages soft' : s.macro.unemployment < 0.04 ? 'tight market, wages rising' : 'normal market'})
          </p>
        )}
      </Card>

      <Card title={`Your team (${team.length})`} icon="people">
        {team.length === 0 ? <Empty icon="people">It's just you for now. Hire someone when the queue gets long or the ovens sit idle.</Empty> : <ul className="staff-list">{team.map((e) => <EmployeeRow key={e.id} e={e} />)}</ul>}
        <p className="small muted">
          Wages are paid every day, busy or not: a <Tip concept="fixedCost">fixed cost</Tip>. Happy staff work faster; staff paid below the going rate drift away.
        </p>
      </Card>

      <Card title="Job applicants" icon="note" aside={<span className="small muted">New faces every Monday</span>}>
        {branches.length > 0 && (
          <label className="small">
            Hire for{' '}
            <select value={branch ?? 'home'} onChange={(e) => setBranch(e.target.value === 'home' ? null : Number(e.target.value))}>
              <option value="home">Main shop</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {s.applicants.length === 0 ? (
          <Empty icon="note">No one is looking for work this week. Check again on Monday.</Empty>
        ) : (
          <ul className="staff-list">
            {s.applicants.map((a) => {
              const v = hireValue(s, a.role, a.skill);
              return (
                <li key={a.id} className="staff-row">
                  <Person look={a.look} scale={3} />
                  <div className="staff-info">
                    <b>
                      {a.name} <span className="muted">· {ROLES[a.role].name}</span>
                    </b>
                    <span className="small">
                      Skill {Array.from({ length: a.skill }).map((_, i) => (<span key={i} className="star-on"><Sprite name="star" scale={2} /></span>))}
                      {Array.from({ length: 5 - a.skill }).map((_, i) => (<span key={i} className="star-off"><Sprite name="star" scale={2} /></span>))} · asks {money2(a.wage)}/hour
                    </span>
                    <span className="small">{ROLES[a.role].blurb}</span>
                    <span className="small marginal">
                      Costs about <b>{money(v.cost)}/day</b>. Adds {v.adds}
                      {v.addsValue > 0 && (
                        <>
                          , worth roughly <b>{money(v.addsValue)}/day</b> in extra contribution
                        </>
                      )}
                      .
                    </span>
                  </div>
                  <div className="staff-act">
                    <Btn kind="primary" disabled={s.phase === 'service' || s.cash < hireFee} onClick={() => dispatch({ type: 'hire', applicantId: a.id, branch })}>
                      Hire ({money(hireFee)} fee)
                    </Btn>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="small muted">
          Compare what each person adds with what they cost: that's <Tip concept="marginal">marginal analysis</Tip>.
        </p>
      </Card>

      <Card title="What each role does" icon="book">
        <ul className="role-list">
          {ROLE_ORDER.map((r: RoleId) => (
            <li key={r}>
              <b>{ROLES[r].name}</b> <span className="muted" lang="vi">({ROLES[r].vi})</span>: {ROLES[r].blurb} <span className="muted">Going rate {money2(marketWage(s, r))}/hour.</span>
            </li>
          ))}
        </ul>
        <Sprite name="people" scale={2} />
      </Card>
    </div>
  );
}
