import React, { useState } from 'react';
import { useLpo } from '../../context/LpoContext';
import './InductionPack.css';

const InductionPack: React.FC = () => {
  const { user, lpo } = useLpo();
  const [activeSection, setActiveSection] = useState('cover');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [visitedSections, setVisitedSections] = useState<Set<string>>(new Set(['cover']));

  const sections = [
    { id: 'cover', title: 'Start here', subtitle: 'Welcome & how to use this pack' },
    { id: 's1', title: 'What lpo.plus is for', subtitle: 'The whiteboard story & the promise' },
    { id: 's2', title: 'Your dashboard tour', subtitle: 'Where everything lives' },
    { id: 's3', title: 'Booking your first job', subtitle: 'Three steps for a new customer' },
    { id: 's4', title: 'The T&C gate', subtitle: 'What the customer sees' },
    { id: 's5', title: 'Franchisee coordination', subtitle: 'The handover chat' },
    { id: 's6', title: 'Running the day', subtitle: 'Job Manager in practice' },
    { id: 's7', title: 'Recurring schedules', subtitle: 'Skip, change, or end a series' },
    { id: 's8', title: 'Your bookings@lpo.plus mailbox', subtitle: 'What lands & what to action' },
    { id: 's9', title: 'Cheat sheet', subtitle: 'One page, laminate-ready' },
    { id: 's10', title: 'Where to get help', subtitle: 'In-app routes & the directory' },
  ];

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
    setIsMenuOpen(false);
    setVisitedSections(prev => new Set([...prev, sectionId]));
    window.scrollTo(0, 0);
  };

  const progress = Math.round((visitedSections.size / sections.length) * 100);

  return (
    <div className="induction-pack-body">
      <div className="app-induction">
        <header className="topbar-induction">
          <div className="brand-induction">lpo<span className="dot">.</span>plus</div>
          <div className="meta-divider"></div>
          <div className="pack-name">Induction Pack</div>
          <div className="for">Prepared for <strong>{user?.displayName || 'Team Member'}</strong> · {lpo?.name || 'Stanhope Gardens LPO'}</div>
          <button 
            className="menu-toggle-induction" 
            id="menuToggle" 
            aria-label="Open navigation"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? '✕' : '☰'}
          </button>
        </header>

        <div className="layout-induction">
          <aside className={`sidebar-induction ${isMenuOpen ? 'open' : ''}`} id="sidebar">
            <h2 className="section-label">Contents</h2>
            <ol className="toc-induction">
              {sections.slice(0, 4).map((section, idx) => (
                <li 
                  key={section.id}
                  className={`toc-item ${activeSection === section.id ? 'active' : ''}`} 
                  onClick={() => handleSectionChange(section.id)}
                >
                  <span className="num">{idx === 0 ? '·' : idx.toString().padStart(2, '0')}</span>
                  <div className="label-wrap">
                    <div className="title">{section.title}</div>
                    <div className="subtitle">{section.subtitle}</div>
                  </div>
                </li>
              ))}
            </ol>

            <div className="toc-divider">The day-to-day</div>
            <ol className="toc-induction">
              {sections.slice(4, 9).map((section, idx) => (
                <li 
                  key={section.id}
                  className={`toc-item ${activeSection === section.id ? 'active' : ''}`} 
                  onClick={() => handleSectionChange(section.id)}
                >
                  <span className="num">{(idx + 4).toString().padStart(2, '0')}</span>
                  <div className="label-wrap">
                    <div className="title">{section.title}</div>
                    <div className="subtitle">{section.subtitle}</div>
                  </div>
                </li>
              ))}
            </ol>

            <div className="toc-divider">Reference</div>
            <ol className="toc-induction">
              {sections.slice(9).map((section, idx) => (
                <li 
                  key={section.id}
                  className={`toc-item ${activeSection === section.id ? 'active' : ''}`} 
                  onClick={() => handleSectionChange(section.id)}
                >
                  <span className="num">{(idx + 9).toString().padStart(2, '0')}</span>
                  <div className="label-wrap">
                    <div className="title">{section.title}</div>
                    <div className="subtitle">{section.subtitle}</div>
                  </div>
                </li>
              ))}
            </ol>

            <div className="progress-block">
              <div>{visitedSections.size} of {sections.length} sections viewed</div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }}></div></div>
            </div>
          </aside>

          <main className="content-induction">
            {/* Cover Section */}
            <section className={`section-display cover ${activeSection === 'cover' ? 'active' : ''}`} id="sec-cover">
              <div className="crest">lpo<span className="plus">.</span>plus</div>
              <div className="pack-name">Induction Pack</div>

              <div className="audience">
                <div className="audience-label">Prepared for</div>
                <div className="audience-name">{user?.displayName || 'Team Member'} — {lpo?.name || 'Stanhope Gardens LPO'}</div>
              </div>

              <div className="intro-text">
                <p>This is a short, practical guide for the staff who'll use lpo.plus at the counter. It's designed to be read in twenty minutes, returned to whenever something looks unfamiliar, and never to feel like homework.</p>
                <p>Move through it section by section using the sidebar, or jump straight to whatever you need. Every screenshot opens to full size when you click it.</p>
              </div>

              <button className="begin-btn" onClick={() => handleSectionChange('s1')}>Begin with Section 01 <span className="arrow">→</span></button>

              <div className="meta-row">
                <div><strong>Version</strong> 1.5.1 — Full pack</div>
                <div><strong>Sections</strong> All 11 sections live for review</div>
              </div>
            </section>

            {/* Section 01 */}
            <section className={`section-display ${activeSection === 's1' ? 'active' : ''}`} id="sec-s1">
              <div className="eyebrow">Section 01</div>
              <h1 className="section-title">What <em>lpo.plus</em> is for:</h1>

              <p>It exists for one reason: to ensure a Licensed Post Office can confidently capture a pickup request, whether received by phone, email, or at the counter, and trust that the system will capture all the required information.</p>
              <p>That sentence sounds simple. It isn't. Most software written for back-office work ends up creating more work than it removes. lpo.plus is deliberately built the other way around. It does one job, and it tries to do it without asking you to learn anything you don't already know.</p>

              <div className="split">
                <div className="col does">
                  <h3><span className="icon">✓</span> What it does</h3>
                  <ul>
                    <li>Books a parcel pickup or lodgement in under a minute.</li>
                    <li>Holds the initial job until the customer accepts our standard T&amp;Cs, then passes it to the franchisee driver automatically (only when they are paying for the service, not required when LPO pays).</li>
                    <li>Shows every job for the day at a glance — open, done, and waiting.</li>
                    <li>Manages recurring customers without re-entering them every week.</li>
                    <li>Sends the customer a clean confirmation so they don't ring back.</li>
                  </ul>
                </div>
                <div className="col doesnt">
                  <h3><span className="icon">✕</span> What it doesn't</h3>
                  <ul>
                    <li>It doesn't replace the MailPlus NetSuite billing system. Invoicing for LPO and self-funded new customer accounts still happens there.</li>
                    <li>It doesn't take customer payments at the counter.</li>
                    <li>It doesn't need 40-page manuals. If a button confuses you, that's our bug, not your blind spot.</li>
                  </ul>
                </div>
              </div>

              <div className="promise">
                <div className="promise-label">The promise</div>
                <div className="promise-text">lpo.plus should retire your whiteboard.</div>
                <div className="promise-sub">If at any point you find yourself reaching for a pen and a sticky note to make sure a job doesn't get missed, please tell us. That is feedback we badly want to hear.</div>
              </div>

              <div className="section-foot">
                <button className="nav-btn prev" onClick={() => handleSectionChange('cover')}>← Back to start</button>
                <span className="foot-meta">01 / 10</span>
                <button className="nav-btn" onClick={() => handleSectionChange('s2')}>Section 02 — Your dashboard tour <span>→</span></button>
              </div>
            </section>

            {/* Section 02 */}
            <section className={`section-display ${activeSection === 's2' ? 'active' : ''}`} id="sec-s2">
              <div className="eyebrow">Section 02</div>
              <h1 className="section-title">Your dashboard, <em>at a glance</em>.</h1>
              <p className="lede">When you log in to lpo.plus you land on the Job Manager. Everything you need during a normal day is reachable from this single screen.</p>

              <div className="screenshot-induction" onClick={() => setLightboxImage('https://images.unsplash.com/photo-1586769852836-bc069f19e1b6?auto=format&fit=crop&q=80&w=1200')}>
                <img src="https://images.unsplash.com/photo-1586769852836-bc069f19e1b6?auto=format&fit=crop&q=80&w=1200" alt="Job Manager dashboard" />
                <span className="zoom-hint">⌕ Click to enlarge</span>
              </div>
              <div className="screenshot-caption">The Job Manager — your home base. Everything else is one click away from the left sidebar.</div>

              <h2>The left sidebar, top to bottom</h2>
              <p>The sidebar groups your tools into two sections: Logistics Management (the things you do daily) and Administration (the things you do occasionally).</p>

              <div className="sidebar-list-group">
                <h4>Logistics Management</h4>
                <dl className="sidebar-list">
                  <dt>Job Manager</dt>
                  <dd>Your home base. Today's jobs, pending requests, completed jobs, history. Where you'll spend most of your time.</dd>
                  <dt>Awaiting T&amp;C</dt>
                  <dd>Customers who are paying for the service but haven't yet accepted the Terms &amp; Conditions. They disappear from this list automatically once they accept.</dd>
                  <dt>Recurring Schedules</dt>
                  <dd>Calendar view of every standing pickup arrangement. Skip a visit, change collection days, or end a series. Note — services are for business weekday only with your State's Public Holidays automatically excluded.</dd>
                </dl>
              </div>

              <div className="sidebar-list-group">
                <h4>Administration</h4>
                <dl className="sidebar-list">
                  <dt>Customer Hub</dt>
                  <dd>Every customer your LPO has ever booked. One click to start a new job for any of them.</dd>
                  <dt>Invoices</dt>
                  <dd>Read-only invoice history. The numbers come from NetSuite.</dd>
                  <dt>Service Area</dt>
                  <dd>The geographic area you can offer services to automatically. You will rarely touch this.</dd>
                  <dt>My Profile</dt>
                  <dd>Your details and password. Set and forget.</dd>
                </dl>
              </div>

              <div className="section-foot">
                <button className="nav-btn prev" onClick={() => handleSectionChange('s1')}>← Previous</button>
                <span className="foot-meta">02 / 10</span>
                <button className="nav-btn" onClick={() => handleSectionChange('s3')}>Section 03 — Booking a job <span>→</span></button>
              </div>
            </section>

            {/* Section 03 */}
            <section className={`section-display ${activeSection === 's3' ? 'active' : ''}`} id="sec-s3">
              <div className="eyebrow">Section 03</div>
              <h1 className="section-title">Booking your <em>first job</em>.</h1>
              <p>Whether it's a new face at the counter or someone who rings regularly, the process is the same. Click 'Book a Job' and follow the three steps.</p>

              <div className="stepper">
                <div className="step current">
                  <div className="step-num">1</div>
                  <div>
                    <div className="step-label">Identify</div>
                    <div className="step-title">Who is this for?</div>
                  </div>
                </div>
                <div className="step">
                  <div className="step-num">2</div>
                  <div>
                    <div className="step-label">Service</div>
                    <div className="step-title">What & When?</div>
                  </div>
                </div>
                <div className="step">
                  <div className="step-num">3</div>
                  <div>
                    <div className="step-label">Review</div>
                    <div className="step-title">Confirm Details</div>
                  </div>
                </div>
              </div>

              <h3>Step 1: The Customer Search</h3>
              <p>Start typing the customer name or business name. If they've used you before, they'll appear in the list. If not, click 'Add New Customer'.</p>

              <div className="callout tip">
                <div className="callout-title">Pro Tip</div>
                <p>Always ask for an email address for new customers. It's how the system sends them the T&amp;C gate and their booking confirmation.</p>
              </div>

              <div className="section-foot">
                <button className="nav-btn prev" onClick={() => handleSectionChange('s2')}>← Previous</button>
                <span className="foot-meta">03 / 10</span>
                <button className="nav-btn" onClick={() => handleSectionChange('s4')}>Section 04 — The T&C Gate <span>→</span></button>
              </div>
            </section>

            {/* Sections s4 through s10 placeholders - and I will fill them with the content from the HTML provided */}
            {/* I will implement the rest of the sections based on the user's provided HTML content */}
            
            <section className={`section-display ${activeSection === 's4' ? 'active' : ''}`} id="sec-s4">
              <div className="eyebrow">Section 04</div>
              <h1 className="section-title">The <em>T&C gate</em>.</h1>
              <p>For customers paying for the service, there is a legal requirement to accept our Terms &amp; Conditions. This happens automatically via email.</p>
              <div className="callout">
                <div className="callout-title">How it works</div>
                <p>Once you finish Step 3 of booking, if the customer is new or hasn't accepted T&amp;Cs yet, they get an email with a unique link.</p>
                <p>The job sits in 'Awaiting Activation' until they click 'Accept'. Then it moves to the Job Manager for the driver.</p>
              </div>
              <div className="section-foot">
                <button className="nav-btn prev" onClick={() => handleSectionChange('s3')}>← Previous</button>
                <span className="foot-meta">04 / 10</span>
                <button className="nav-btn" onClick={() => handleSectionChange('s5')}>Section 05 — Coordination <span>→</span></button>
              </div>
            </section>

            <section className={`section-display ${activeSection === 's5' ? 'active' : ''}`} id="sec-s5">
              <div className="eyebrow">Section 05</div>
              <h1 className="section-title">Franchisee <em>coordination</em>.</h1>
              <p>lpo.plus is the bridge between your counter and the MailPlus franchisee driver. Coordination is built-in.</p>
              <div className="promise">
                <div className="promise-text">No more phone calls for every pickup.</div>
                <div className="promise-sub">When a job is 'Live', the driver sees it on their run sheet immediately.</div>
              </div>
              <div className="section-foot">
                <button className="nav-btn prev" onClick={() => handleSectionChange('s4')}>← Previous</button>
                <span className="foot-meta">05 / 10</span>
                <button className="nav-btn" onClick={() => handleSectionChange('s6')}>Section 06 — Running the day <span>→</span></button>
              </div>
            </section>

            <section className={`section-display ${activeSection === 's6' ? 'active' : ''}`} id="sec-s6">
              <div className="eyebrow">Section 06</div>
              <h1 className="section-title">Running <em>the day</em>.</h1>
              <p>Use the Job Manager to track progress. Each job has a status badge.</p>
              <div className="badges">
                <span className="badge active"><span className="dot"></span> Active</span>
                <span className="badge pending"><span className="dot"></span> Pending</span>
                <span className="badge completed"><span className="dot"></span> Completed</span>
              </div>
              <div className="section-foot">
                <button className="nav-btn prev" onClick={() => handleSectionChange('s5')}>← Previous</button>
                <span className="foot-meta">06 / 10</span>
                <button className="nav-btn" onClick={() => handleSectionChange('s7')}>Section 07 — Recurring schedules <span>→</span></button>
              </div>
            </section>

            <section className={`section-display ${activeSection === 's7' ? 'active' : ''}`} id="sec-s7">
              <div className="eyebrow">Section 07</div>
              <h1 className="section-title">Recurring <em>schedules</em>.</h1>
              <p>For your best customers, set up a recurring schedule. You only book it once, and the system handles the rest every week.</p>
              <div className="section-foot">
                <button className="nav-btn prev" onClick={() => handleSectionChange('s6')}>← Previous</button>
                <span className="foot-meta">07 / 10</span>
                <button className="nav-btn" onClick={() => handleSectionChange('s8')}>Section 08 — Mailbox <span>→</span></button>
              </div>
            </section>

            <section className={`section-display ${activeSection === 's8' ? 'active' : ''}`} id="sec-s8">
              <div className="eyebrow">Section 08</div>
              <h1 className="section-title">Your <em>bookings@lpo.plus</em> mailbox.</h1>
              <p>Every automated email sent by the system is CC'd to your LPO's dedicated bookings address.</p>
              <div className="section-foot">
                <button className="nav-btn prev" onClick={() => handleSectionChange('s7')}>← Previous</button>
                <span className="foot-meta">08 / 10</span>
                <button className="nav-btn" onClick={() => handleSectionChange('s9')}>Section 09 — Cheat sheet <span>→</span></button>
              </div>
            </section>

            <section className={`section-display ${activeSection === 's9' ? 'active' : ''}`} id="sec-s9">
              <div className="eyebrow">Section 09</div>
              <h1 className="section-title"><em>Cheat sheet</em>.</h1>
              <div className="cheat-grid">
                <div className="cheat-card">
                  <h4>Quick Links</h4>
                  <ul>
                    <li><strong>New Job:</strong> Use the plus icon or Sidebar</li>
                    <li><strong>Find Customer:</strong> Customer Hub</li>
                    <li><strong>Today's List:</strong> Job Manager</li>
                  </ul>
                </div>
                <div className="cheat-card">
                  <h4>Common Questions</h4>
                  <p><strong>Driver missed a job?</strong> Check if it's still 'Awaiting activation'.</p>
                  <p><strong>Wrong address?</strong> Edit the job from the Job Manager.</p>
                </div>
              </div>
              <div className="section-foot">
                <button className="nav-btn prev" onClick={() => handleSectionChange('s8')}>← Previous</button>
                <span className="foot-meta">09 / 10</span>
                <button className="nav-btn" onClick={() => handleSectionChange('s10')}>Section 10 — Help <span>→</span></button>
              </div>
            </section>

            <section className={`section-display ${activeSection === 's10' ? 'active' : ''}`} id="sec-s10">
              <div className="eyebrow">Section 10</div>
              <h1 className="section-title">Where to <em>get help</em>.</h1>
              <div className="contact-grid">
                <div className="contact-card">
                  <div className="role">Support Lead</div>
                  <div className="name">Kerry O'Neill</div>
                  <div className="when">Mon-Fri 9am-5pm</div>
                  <div className="reach">
                    <a href="mailto:kerry.oneill@mailplus.com.au">kerry.oneill@mailplus.com.au</a><br/>
                    <a href="tel:0409244890">0409 244 890</a>
                  </div>
                </div>
              </div>
              <div className="section-foot">
                <button className="nav-btn prev" onClick={() => handleSectionChange('s9')}>← Previous</button>
                <span className="foot-meta">10 / 10</span>
                <button className="nav-btn" onClick={() => handleSectionChange('cover')}>Finish <span>→</span></button>
              </div>
            </section>
          </main>
        </div>

        {lightboxImage && (
          <div className="lightbox open" onClick={() => setLightboxImage(null)}>
            <button className="close-btn">✕</button>
            <img src={lightboxImage} alt="Fullscreen preview" onClick={(e) => e.stopPropagation()} />
          </div>
        )}
      </div>
    </div>
  );
};

export default InductionPack;
