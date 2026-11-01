"use client";

// The public landing page at "/". Layout and copy follow docs/handoff/landing/reference/loose-ends-landing.html.
import Image from "next/image";
import Link from "next/link";
import { useCallback, useId, useRef, useState, type MouseEvent } from "react";
import { Icon } from "@/components/landing/Icon";
import { RolePicker } from "@/components/landing/RolePicker";
import { ThreadReveal } from "@/components/landing/ThreadReveal";
import "./landing.css";

export function LandingPage() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerTitleId = useId();
  // The button that opened the picker gets focus back when it closes.
  const openerRef = useRef<HTMLElement | null>(null);

  const openPicker = useCallback((e: MouseEvent<HTMLElement>) => {
    openerRef.current = e.currentTarget;
    setPickerOpen(true);
  }, []);

  const closePicker = useCallback(() => {
    setPickerOpen(false);
    openerRef.current?.focus();
  }, []);

  return (
    <div className="landing">
      <header className="wrap nav">
        <a className="logo" href="#top" aria-label="Loose Ends home">
          <svg viewBox="0 0 80 44" fill="none" stroke="#18201D" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
            <path d="M2 34c8 2 18 2 26-4 8-6 14-16 12-23-1.5-5-8-5-10 1-3 9 4 22 14 25 8 2 18-1 28-4" />
          </svg>
          <span>Loose Ends</span>
        </a>
        <nav className="links" aria-label="Page">
          <a href="#how">How it works</a>
          <a href="#trust">Why trust it</a>
          <a href="#roles">Roles</a>
        </nav>
        <button type="button" className="btnOutline" onClick={openPicker} aria-haspopup="dialog">
          Sign in
        </button>
      </header>

      <main id="top">
        <section className="hero">
          <div className="wrap">
            <div className="heroTop">
              <svg className="heroThread" viewBox="0 0 1208 620" preserveAspectRatio="none" aria-hidden="true">
                <path
                  pathLength={1}
                  d="M0 620 C 240 600, 480 560, 590 470 C 640 428, 660 380, 640 352 C 622 330, 590 350, 606 378 C 624 410, 668 396, 680 350 C 698 282, 690 220, 664 210 C 640 202, 632 250, 660 270 C 684 288, 704 286, 724 280"
                />
                <circle cx={726} cy={280} r={6.5} />
              </svg>

              <div className="heroGrid">
                <div>
                  <p className="eyebrow">Follow-through for startup teams</p>
                  <h1>
                    The meeting ends.
                    <br />
                    The work moves.
                  </h1>
                  <p className="sub">Loose Ends turns team conversations into clear commitments, updates and decisions.</p>
                  <div className="ctas">
                    <button type="button" className="btn" onClick={openPicker} aria-haspopup="dialog">
                      Try the demo <Icon name="arrow" />
                    </button>
                    <a className="linkU" href="#how">
                      See how it works
                    </a>
                  </div>
                </div>

                <div className="dcard" role="region" aria-label="Preview of the Decisions screen: two requests waiting, a date change needing approval and a task needing an owner">
                  <div className="hd">
                    <Icon name="doc" />
                    <div>
                      <h2>Decisions</h2>
                      <p>Requests waiting for an owner</p>
                    </div>
                  </div>
                  <div className="dtabs">
                    <span className="on">
                      Waiting <b>2</b>
                    </span>
                    <span>Resolved</span>
                  </div>
                  <div className="drow">
                    <Icon name="cal" />
                    <div>
                      <div className="dt">
                        Date change <em>Needs approval</em>
                      </div>
                      <div className="ds">Priya asked to move the partner deck</div>
                    </div>
                    <Icon name="chev" />
                  </div>
                  <div className="drow">
                    <Icon name="user" />
                    <div>
                      <div className="dt">
                        Owner needed <em className="grey">Assign</em>
                      </div>
                      <div className="ds">Follow up on an action item</div>
                    </div>
                    <Icon name="chev" />
                  </div>
                  <Link className="dcta" href="/decisions">
                    Review decisions <Icon name="arrow" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="wrap">
            <div className="steps3">
              <div>
                <span className="stepN">01</span>
                <span>
                  <h3>Capture</h3>
                  <p>Paste your meeting notes.</p>
                </span>
              </div>
              <div>
                <span className="stepN">02</span>
                <span>
                  <h3>Follow up</h3>
                  <p>Everyone gets a clear next step.</p>
                </span>
              </div>
              <div>
                <span className="stepN">03</span>
                <span>
                  <h3>Decide</h3>
                  <p>Keep work moving.</p>
                </span>
              </div>
            </div>
          </div>
        </section>

        <ThreadReveal src="/landing/thread-infinity.webp" width={2172} height={724} className="tdivInfinity" />

        <section className="devices" id="how" aria-labelledby="how-h">
          <div className="art">
            <Image
              src="/landing/hero-devices.webp"
              alt="Loose Ends on a laptop and a phone, linked by a thread"
              width={1672}
              height={941}
              sizes="(max-width: 1100px) 150vw, 72vw"
            />
          </div>
          <div className="wrap">
            <div className="copy">
              <p className="eyebrow">How it works</p>
              <h2 className="big" id="how-h">
                Your team stays in email. You see the whole picture.
              </h2>
              <p className="lead">Nobody has to open another tool. Loose Ends does the chasing.</p>
              <ol className="flow">
                <li>
                  <span className="num">1</span>
                  <span>
                    <b>Paste the notes</b>
                    <span>Loose Ends proposes each task with its owner, date and the exact sentence it came from. You approve.</span>
                  </span>
                </li>
                <li>
                  <span className="num">2</span>
                  <span>
                    <b>A short morning email</b>
                    <span>At 8 a.m. everyone gets only their own tasks, most urgent first.</span>
                  </span>
                </li>
                <li>
                  <span className="num">3</span>
                  <span>
                    <b>They just reply</b>
                    <span>“Done.” “Blocked.” “Can I have until Friday?” The board updates itself.</span>
                  </span>
                </li>
              </ol>
            </div>
          </div>
        </section>

        <section className="sec moment" aria-labelledby="km-h">
          <div className="wrap momentGrid">
            <div>
              <p className="eyebrow">The key moment</p>
              <h2 className="big" id="km-h">
                One plain email. Several correct changes.
              </h2>
              <p className="lead">A reply can report progress, flag a blocker and ask for more time at once. The date only moves when the owner says yes.</p>
            </div>
            <div>
              <div className="mail">
                <div className="mailHead">
                  <span>
                    <b>Priya Shah</b> replied to her morning email
                  </span>
                  <span>Tue, 8:15</span>
                </div>
                <div className="mailBody">
                  “Pricing page is live. The partner deck needs until Wednesday the 11th, I’m waiting on numbers from finance.”
                </div>
              </div>
              <div className="arrow">
                <Icon name="down" />
                Seconds later, on the board
              </div>
              <div className="result">
                <div>
                  <span className="resultIco" style={{ background: "#E7F1E3", color: "#2D6A3E" }}>
                    <Icon name="check" />
                  </span>
                  <span>
                    <b>Get the new pricing page live</b>
                    <span>Marked done, in Priya’s words</span>
                  </span>
                  <span className="pill pDone">Done</span>
                </div>
                <div>
                  <span className="resultIco" style={{ background: "#FBE9E5", color: "#8E3426" }}>
                    <Icon name="alert" />
                  </span>
                  <span>
                    <b>Finish the partner deck</b>
                    <span>Blocked: numbers from finance</span>
                  </span>
                  <span className="pill pBlocked">Blocked</span>
                </div>
                <div>
                  <span className="resultIco" style={{ background: "var(--lime-soft)", color: "var(--forest)" }}>
                    <Icon name="pause" />
                  </span>
                  <span>
                    <b>New date: Wed 11 Nov</b>
                    <span>Waiting for Maya. Thu 5 Nov still applies</span>
                  </span>
                  <span className="pill pWait">Needs approval</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="sec dark" id="trust" aria-labelledby="trust-h">
          <Image src="/landing/thread-loop-forest.webp" alt="" aria-hidden="true" fill sizes="100vw" className="bgart" />
          <Image src="/landing/thread-loop-cream-transparent.webp" alt="" aria-hidden="true" width={1122} height={1402} className="bgartM" />
          <div className="wrap">
            <div className="copy">
              <p className="eyebrow">Why teams trust it</p>
              <h2 className="big" id="trust-h">
                The AI suggests. People stay in charge.
              </h2>
              <div className="trust">
                <div>
                  <span className="trustIco">
                    <Icon name="lock" />
                  </span>
                  <span>
                    <b>Dates never move from a reply</b>
                    <span>A request for more time goes to the workstream owner. Nothing changes until they approve.</span>
                  </span>
                </div>
                <div>
                  <span className="trustIco">
                    <Icon name="quote" />
                  </span>
                  <span>
                    <b>Every change shows its source</b>
                    <span>Each update quotes the exact words from the meeting or the email that caused it.</span>
                  </span>
                </div>
                <div>
                  <span className="trustIco">
                    <Icon name="q" />
                  </span>
                  <span>
                    <b>Unclear means a question</b>
                    <span>If a reply could mean two things, Loose Ends asks instead of guessing. No reply shows as unknown, never as on track.</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="sec" id="roles" aria-labelledby="roles-h">
          <div className="wrap">
            <ThreadReveal src="/landing/thread-sweep-loop.webp" width={2205} height={713} className="rolesBand" />
            <p className="eyebrow">One system, three roles</p>
            <h2 className="big" id="roles-h">
              Everyone sees exactly what they need.
            </h2>
            <div className="roles">
              <article className="role">
                <div className="who">
                  <span className="av" style={{ background: "#E3EED3" }}>MC</span>
                  <div>
                    <h3>CEO</h3>
                    <span className="tag">Maya</span>
                  </div>
                </div>
                <p>Sees every workstream: what moved, what is blocked, where she is needed.</p>
                <ul>
                  <li>
                    <Icon name="check" />
                    Overview of all workstreams
                  </li>
                  <li>
                    <Icon name="check" />
                    Decides when an owner asks about their own work
                  </li>
                  <li>
                    <Icon name="check" />
                    Full activity trail
                  </li>
                </ul>
              </article>
              <article className="role">
                <div className="who">
                  <span className="av" style={{ background: "#F6E1D9" }}>PS</span>
                  <div>
                    <h3>Workstream owner</h3>
                    <span className="tag">Priya</span>
                  </div>
                  <span className="soonTag">View coming soon</span>
                </div>
                <p>Approves or declines date changes for the work she owns, with the original reply in view.</p>
                <ul>
                  <li>
                    <Icon name="check" />
                    Decision queue for her workstream
                  </li>
                  <li>
                    <Icon name="check" />
                    Assigns owners to loose tasks
                  </li>
                  <li>
                    <Icon name="check" />
                    Change receipts
                  </li>
                </ul>
              </article>
              <article className="role">
                <div className="who">
                  <span className="av" style={{ background: "#DCE7F2" }}>AR</span>
                  <div>
                    <h3>Team member</h3>
                    <span className="tag">Alex</span>
                  </div>
                  <span className="soonTag">Works by email today</span>
                </div>
                <p>Gets one short email each morning and answers it like a colleague. No new tool to learn.</p>
                <ul>
                  <li>
                    <Icon name="check" />
                    Only their own tasks
                  </li>
                  <li>
                    <Icon name="check" />
                    Reply in plain words
                  </li>
                  <li>
                    <Icon name="check" />
                    Ask for more time in one line
                  </li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="cta" aria-labelledby="cta-h">
          <ThreadReveal src="/landing/thread-wave-loop.webp" width={2172} height={724} className="tdivWave" />
          <div className="wrap">
            <h2 className="big serifBig" id="cta-h">
              Nobody has to send a single reminder.
            </h2>
            <p className="lead">Step into Maya’s seat and see where her team stands, with our demo data.</p>
            <button type="button" className="btn" onClick={openPicker} aria-haspopup="dialog">
              Try the demo <Icon name="arrow" />
            </button>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap">
          <span>© 2026 Loose Ends · Built in a weekend at the Outskill hackathon by Iliyan, Jerry, Valerie, Abir, David and H.T.</span>
          <span>
            Demo data · <a href="/overview">Live app</a>
          </span>
        </div>
      </footer>

      {pickerOpen && <RolePicker onClose={closePicker} titleId={pickerTitleId} />}
    </div>
  );
}
