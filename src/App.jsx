import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from './firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, collection, addDoc, query, onSnapshot, updateDoc, where, orderBy, limit, serverTimestamp } from 'firebase/firestore';

// --- IMPORTS ---
import QRCode from 'react-qr-code'; 
import { Scanner } from '@yudiel/react-qr-scanner'; 

import { Shield, User, LogOut, Plus, CheckCircle, Clock, AlertTriangle, ChevronRight, MessageSquare, Bell, ScanLine, LogIn, LogOut as LogOutIcon, Search, History, Home, QrCode, Ticket } from 'lucide-react';

const CURFEW_HOUR = 22; // 10 PM
const CURFEW_END = 4;   // 4 AM

// Helper to check if currently in curfew hours
const checkCurfew = () => {
  const h = new Date().getHours();
  return h >= CURFEW_HOUR || h < CURFEW_END;
};

// --- STYLES & UTILS ---
// Premium Color Palette & Styles
const styles = {
  container: { background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b' },
  card: { background: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', border: '1px solid #e2e8f0', marginBottom: '16px' },
  input: { width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '12px', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s', background: '#f8fafc' },
  btnMain: { width: '100%', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', transition: 'transform 0.1s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  btnBlue: { background: '#2563eb', color: 'white', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' },
  btnGreen: { background: '#059669', color: 'white', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)' },
  btnRed: { background: '#dc2626', color: 'white', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)' },
  btnGhost: { background: '#f1f5f9', color: '#475569' },
  header: { padding: '20px 24px', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  nav: { position: 'fixed', bottom: 0, left: 0, right: 0, background: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-around', padding: '12px 0', paddingBottom: '24px', zIndex: 50 },
  navBtn: { background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', cursor: 'pointer' },
  navBtnActive: { color: '#2563eb' },
  badge: { padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' },
};

// --- AUTH COMPONENT ---
function Auth() {
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [hostel, setHostel] = useState('A');
  const [room, setRoom] = useState('');
  const [error, setError] = useState('');

  // Reset role to student if switching to register mode (Security Fix)
  useEffect(() => {
    if (isRegister) setRole('student');
  }, [isRegister]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isRegister) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const userData = {
          email, 
          role: 'student', 
          name, 
          createdAt: new Date().toISOString(),
          regNo, hostel, room
        };
        await setDoc(doc(db, "users", cred.user.uid), userData);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) { setError(err.message.replace('Firebase:', '')); }
  };

  return (
    <div style={{...styles.container, display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div style={{...styles.card, width:'100%', maxWidth:'400px', borderTop:'none'}}>
        <div style={{textAlign:'center', marginBottom:'32px'}}>
          <div style={{width:'64px', height:'64px', background:'#eff6ff', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', color:'#2563eb'}}>
            <Shield size={32} />
          </div>
          <h1 style={{fontSize:'1.75rem', color:'#0f172a', fontWeight:'800', margin:0}}>HallPass</h1>
          <p style={{color:'#64748b', fontSize:'0.95rem', margin:'8px 0 0'}}>Campus Access Control</p>
        </div>

        {!isRegister && (
          <div style={{display:'flex', background:'#f1f5f9', padding:'4px', borderRadius:'14px', marginBottom:'24px'}}>
            {['student', 'guard', 'admin'].map(r => (
              <button key={r} onClick={()=>setRole(r)} style={{flex:1, padding:'10px', border:'none', background: role===r?'#ffffff':'transparent', borderRadius:'10px', fontWeight:'600', color: role===r?'#0f172a':'#64748b', boxShadow: role===r?'0 2px 8px rgba(0,0,0,0.05)':'none', cursor:'pointer', textTransform:'capitalize', transition:'all 0.2s'}}>
                {r}
              </button>
            ))}
          </div>
        )}

        {error && <div style={{padding:'14px', background:'#fef2f2', color:'#dc2626', borderRadius:'12px', marginBottom:'20px', fontWeight:'500', border:'1px solid #fecaca', fontSize:'0.9rem'}}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {isRegister && <input style={styles.input} placeholder="Full Name" onChange={e => setName(e.target.value)} required />}
          {isRegister && (
            <>
              <input style={styles.input} placeholder="Reg No (e.g. RA211...)" onChange={e => setRegNo(e.target.value)} required />
              <div style={{display:'flex', gap:'12px'}}>
                <input style={styles.input} placeholder="Hostel (A)" onChange={e => setHostel(e.target.value)} required />
                <input style={styles.input} placeholder="Room (101)" onChange={e => setRoom(e.target.value)} required />
              </div>
            </>
          )}
          <input style={styles.input} type="email" placeholder="Email Address" onChange={e => setEmail(e.target.value)} required />
          <input style={styles.input} type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} required />
          <button type="submit" style={{...styles.btnMain, ...styles.btnBlue, marginTop:'8px'}}>
            {isRegister ? 'Create Student Account' : 'Sign In'}
          </button>
        </form>
        <p onClick={()=>setIsRegister(!isRegister)} style={{textAlign:'center', marginTop:'24px', color:'#64748b', fontSize:'0.9rem', cursor:'pointer'}}>
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <span style={{color:'#2563eb', fontWeight:'600'}}>
             {isRegister ? 'Login' : 'Sign Up'}
          </span>
        </p>
      </div>
    </div>
  );
}

// --- STUDENT DASHBOARD ---
function StudentDash({ user }) {
  const [tab, setTab] = useState('home');
  const [lateStatus, setLateStatus] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [ticket, setTicket] = useState({title:'', desc:''});
  const [isCurfew, setIsCurfew] = useState(checkCurfew());
  
  // NEW STATE: Track how many announcements have been read
  const [readCount, setReadCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIsCurfew(checkCurfew()), 60000);

    const unsubReq = onSnapshot(query(collection(db, "requests"), where("uid", "==", user.uid), where("status", "in", ["pending", "approved"])), 
      snap => {
        if (!snap.empty && tab === 'home') setLateStatus(snap.docs[0].data());
        else if (snap.empty) setLateStatus(null);
      }
    );
    
    const unsubAnn = onSnapshot(query(collection(db, "announcements"), orderBy("timestamp", "desc")), snap => {
      const msgs = snap.docs.map(d=>d.data()).filter(m => m.target === 'All' || m.target === user.hostel);
      setAnnouncements(msgs);
    });
    
    const unsubTick = onSnapshot(query(collection(db, "tickets"), where("uid", "==", user.uid)), snap => {
      const sortedTickets = snap.docs.map(d=>({id: d.id, ...d.data()}))
        .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setTickets(sortedTickets);
    });

    return () => { clearInterval(timer); unsubReq(); unsubAnn(); unsubTick(); };
  }, [user]); 

  // FEATURE: Clear banner & Reset Unread Count
  useEffect(() => {
    if (tab !== 'home') {
      setLateStatus(null);
    }
    // Logic: If opening 'notice' tab, mark all current announcements as read
    if (tab === 'notice') {
      setReadCount(announcements.length);
    }
  }, [tab, announcements.length]);

  const qrData = JSON.stringify({ uid: user.uid, regNo: user.regNo, name: user.name, hostel: user.hostel, room: user.room });
  
  // Calculate unread badge number
  const unreadBadgeCount = Math.max(0, announcements.length - readCount);

  const submitTicket = async () => {
    if(!ticket.title) return;
    await addDoc(collection(db, "tickets"), { uid: user.uid, name: user.name, room: user.room, title: ticket.title, desc: ticket.desc, status: 'Open', timestamp: serverTimestamp() });
    setModalOpen(false); setTicket({title:'', desc:''}); alert('Ticket Sent');
  };

  const requestLate = async () => {
    const reason = prompt("Enter reason for late entry:");
    if (!reason) return;
    await addDoc(collection(db, "requests"), { uid: user.uid, name: user.name, regNo: user.regNo, hostel: user.hostel, status: 'pending', reason: reason, timestamp: serverTimestamp() });
    alert('Request Sent');
    setLateStatus({ status: 'pending', reason }); 
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div><h1 style={{fontSize:'1.25rem', fontWeight:'700', margin:0, color:'#0f172a'}}>Hello, {user.name.split(' ')[0]}</h1><p style={{margin:0, fontSize:'0.85rem', color:'#64748b'}}>{user.regNo}</p></div>
        <button onClick={()=>signOut(auth)} style={{border:'none', background:'#fee2e2', padding:'8px', borderRadius:'50%', cursor:'pointer', display:'flex'}}><LogOut color="#dc2626" size={20}/></button>
      </header>

      <div style={{padding:'24px', paddingBottom:'100px'}}>
        {tab === 'home' && (
          <>
            <div style={{...styles.card, textAlign:'center', borderTop:'none'}}>
              <p style={{fontSize:'0.75rem', fontWeight:'700', color:'#94a3b8', letterSpacing:'1px', marginBottom:'24px', textTransform:'uppercase'}}>Digital Access Key</p>
              <div style={{background:'white', padding:'20px', borderRadius:'24px', border:'1px solid #e2e8f0', display:'inline-block', marginBottom:'24px', boxShadow:'0 10px 25px -5px rgba(0,0,0,0.1)'}}>
                <QRCode value={qrData} size={200} />
              </div>
              <h2 style={{margin:'0 0 12px', fontSize:'2.5rem', fontWeight:'800', color:'#0f172a'}}>{user.room}</h2>
              <div style={{...styles.badge, background: isCurfew ? '#fef2f2' : '#ecfdf5', color: isCurfew ? '#dc2626' : '#059669', display:'inline-flex', alignItems:'center', gap:'6px'}}>
                {isCurfew ? <><AlertTriangle size={14}/> CURFEW ACTIVE</> : <><CheckCircle size={14}/> ACCESS GRANTED</>}
              </div>
            </div>
            {lateStatus && (
              <div style={{...styles.card, background: lateStatus.status === 'approved' ? '#f0fdf4' : '#fffbeb', border: lateStatus.status === 'approved' ? '1px solid #86efac' : '1px solid #fcd34d'}}>
                 <h3 style={{color: lateStatus.status === 'approved' ? '#166534' : '#b45309', marginTop:0, fontSize:'1.1rem', display:'flex', alignItems:'center', gap:'8px'}}>
                    {lateStatus.status === 'approved' ? <CheckCircle size={20}/> : <Clock size={20}/>}
                    Request {lateStatus.status.charAt(0).toUpperCase() + lateStatus.status.slice(1)}
                 </h3>
                 <p style={{marginBottom:0, fontWeight:'500', color:'#475569'}}>Reason: {lateStatus.reason}</p>
                 {lateStatus.status === 'approved' && <p style={{fontSize:'0.85rem', marginTop:'8px', color:'#166534'}}>Show this to guard for one-time entry.</p>}
              </div>
            )}
            {!lateStatus && (
              <button onClick={requestLate} style={{...styles.btnMain, ...styles.btnGhost, justifyContent:'space-between', background:'#ffffff', border:'1px solid #e2e8f0', color:'#0f172a'}}>
                Request Late Entry <ChevronRight size={20} color="#94a3b8"/>
              </button>
            )}
          </>
        )}

        {tab === 'notice' && (
          <div>
            <h3 style={{marginBottom:'20px', color:'#0f172a', fontWeight:'700'}}>Notice Board</h3>
            {announcements.map((a, i) => (
              <div key={i} style={{...styles.card, borderLeft: `4px solid ${a.target==='All'?'#2563eb':'#db2777'}`}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'12px'}}>
                  <span style={{...styles.badge, background:'#f1f5f9', color:'#475569'}}>{a.target} Students</span>
                  <span style={{fontSize:'0.75rem', fontWeight:'600', color:'#94a3b8'}}>Today</span>
                </div>
                <p style={{margin:0, fontWeight:'500', fontSize:'1rem', lineHeight:'1.6', color:'#334155'}}>{a.message}</p>
              </div>
            ))}
          </div>
        )}
        
        {tab === 'help' && (
           <div>
             <div style={{...styles.card, cursor:'pointer', border:'1px dashed #2563eb', background:'#eff6ff'}} onClick={()=>setModalOpen(true)}>
               <div style={{display:'flex', gap:'16px', alignItems:'center'}}>
                 <div style={{background:'#2563eb', padding:'10px', borderRadius:'10px', color:'white'}}><Plus size={24}/></div>
                 <div><h3 style={{margin:0, color:'#1e3a8a', fontSize:'1.1rem'}}>Create Ticket</h3><p style={{margin:0, fontSize:'0.85rem', fontWeight:'500', color:'#60a5fa'}}>Maintenance & Repairs</p></div>
               </div>
             </div>
             
             <h3 style={{margin:'32px 0 16px', color:'#0f172a', fontWeight:'700'}}>My Tickets</h3>
             {tickets.length === 0 && <p style={{textAlign:'center', color:'#94a3b8', fontSize:'0.9rem'}}>No active tickets.</p>}
             {tickets.map(t => (
               <div key={t.id} style={{...styles.card, padding:'20px'}}>
                 <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                   <div>
                      <span style={{fontSize:'0.75rem', color:'#94a3b8', fontWeight:'700'}}>ID: #{t.id.substring(0,4).toUpperCase()}</span>
                      <h4 style={{margin:'6px 0', fontSize:'1.1rem', color:'#0f172a'}}>{t.title}</h4>
                      <p style={{margin:0, color:'#64748b', fontSize:'0.9rem'}}>{t.desc}</p>
                   </div>
                   <span style={{...styles.badge, background: t.status==='Open'?'#fff7ed':'#f0fdf4', color: t.status==='Open'?'#c2410c':'#15803d'}}>{t.status}</span>
                 </div>
               </div>
             ))}
           </div>
        )}
      </div>

      <div style={styles.nav}>
        <button style={{...styles.navBtn, color: tab==='home'?'#2563eb':'#94a3b8'}} onClick={()=>setTab('home')}><Home size={26}/>Home</button>
        <button style={{...styles.navBtn, color: tab==='notice'?'#2563eb':'#94a3b8', position:'relative'}} onClick={()=>setTab('notice')}>
          <Bell size={26}/>
          Notice
          {/* BADGE: Only shows if there are new unread items */}
          {unreadBadgeCount > 0 && (
            <span style={{
              position:'absolute', top:'-4px', right:'12px', background:'#ef4444', color:'white', fontSize:'0.7rem', fontWeight:'700', 
              borderRadius:'50%', width:'18px', height:'18px', display:'flex', alignItems:'center', justifyContent:'center',
              border:'2px solid white'
            }}>
              {unreadBadgeCount}
            </span>
          )}
        </button>
        <button style={{...styles.navBtn, color: tab==='help'?'#2563eb':'#94a3b8'}} onClick={()=>setTab('help')}><MessageSquare size={26}/>Help</button>
      </div>

      {modalOpen && (
        <div style={{position:'fixed', inset:0, background:'rgba(15, 23, 42, 0.6)', backdropFilter:'blur(4px)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px'}}>
          <div style={{...styles.card, width:'100%', maxWidth:'400px', margin:0}}>
            <h2 style={{marginTop:0, color:'#0f172a'}}>New Ticket</h2>
            <input style={styles.input} placeholder="Issue Title (e.g. Broken Fan)" value={ticket.title} onChange={e=>setTicket({...ticket, title:e.target.value})}/>
            <textarea style={{...styles.input, height:'100px', resize:'none'}} placeholder="Description..." value={ticket.desc} onChange={e=>setTicket({...ticket, desc:e.target.value})}/>
            <div style={{display:'flex', gap:'12px'}}>
              <button style={{...styles.btnMain, ...styles.btnGhost}} onClick={()=>setModalOpen(false)}>Cancel</button>
              <button style={{...styles.btnMain, ...styles.btnBlue}} onClick={submitTicket}>Submit Ticket</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- GUARD DASHBOARD ---
function GuardDash({ user }) {
  const [tab, setTab] = useState('scan');
  const [scanResult, setScanResult] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [scanning, setScanning] = useState(false);
  const scanLock = useRef(false);

  useEffect(() => { onSnapshot(query(collection(db, "announcements"), orderBy("timestamp", "desc")), snap => setAnnouncements(snap.docs.map(d=>d.data()))); }, []);

  const handleScan = async (data) => {
    if (data && !scanLock.current) {
      scanLock.current = true;
      setScanning(false);
      
      try {
        const student = JSON.parse(data);
        const q = query(collection(db, "requests"), where("uid", "==", student.uid), where("status", "==", "approved"), limit(1));
        const snap = await getDocs(q);
        const requestData = !snap.empty ? { ...snap.docs[0].data(), reqId: snap.docs[0].id } : null;
        
        setScanResult({ ...student, isApproved: !!requestData, requestId: requestData?.reqId });
      } catch (e) { 
        alert("Invalid QR Code"); 
        setScanning(false); 
      }
    }
  };

  const logAction = async (type) => { 
    if (!scanResult) return;
    const isLate = checkCurfew();
    if (isLate && !scanResult.isApproved) {
      alert("BLOCKED: Student does not have permission for late movement.");
      return; 
    }
    
    await addDoc(collection(db, "logs"), { 
      uid: scanResult.uid, name: scanResult.name, regNo: scanResult.regNo, type, 
      timestamp: serverTimestamp(), isLate: (type === 'entry' && isLate), approved: scanResult.isApproved, guardId: user.uid 
    });

    if (scanResult.requestId) await updateDoc(doc(db, "requests", scanResult.requestId), { status: 'closed' });

    alert(`Logged ${type.toUpperCase()}`); 
    setScanResult(null);
  };

  const cancelScan = () => { setScanResult(null); setScanning(false); };
  const startScanning = () => { scanLock.current = false; setScanning(true); };

  return (
    <div style={styles.container}>
      <header style={{...styles.header, borderBottom:'1px solid #10b981'}}>
        <div><h1 style={{fontSize:'1.25rem', fontWeight:'700', margin:0, color:'#059669'}}>Guard Panel</h1><p style={{margin:0, fontSize:'0.85rem', color:'#64748b'}}>Main Gate</p></div>
        <button onClick={()=>signOut(auth)} style={{border:'none', background:'#fee2e2', padding:'8px', borderRadius:'50%', cursor:'pointer'}}><LogOut color="#dc2626" size={20}/></button>
      </header>

      <div style={{padding:'24px', paddingBottom:'100px'}}>
        {tab === 'scan' && !scanResult && (
          <div style={{...styles.card, textAlign:'center', padding:'48px 24px'}}>
             {!scanning ? (
               <>
                 <div style={{background:'#ecfdf5', width:'100px', height:'100px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 32px', color:'#059669'}}>
                   <QrCode size={48}/>
                 </div>
                 <h2 style={{fontSize:'1.75rem', color:'#0f172a', marginBottom:'12px'}}>Scan Entry Pass</h2>
                 <p style={{color:'#64748b', marginBottom:'40px'}}>Ensure student screen is bright</p>
                 <button style={{...styles.btnMain, ...styles.btnGreen}} onClick={startScanning}><ScanLine size={20}/> Open Scanner</button>
               </>
             ) : (
               <div style={{position:'relative', height:'350px', borderRadius:'24px', overflow:'hidden', background:'black'}}>
                 <div style={{width:'100%', height:'100%'}}>
                    <Scanner onScan={(result) => { if (result && result.length > 0) handleScan(result[0].rawValue); }} />
                 </div>
                 <button onClick={()=>setScanning(false)} style={{position:'absolute', bottom:'24px', left:'50%', transform:'translateX(-50%)', background:'white', border:'none', padding:'10px 24px', borderRadius:'30px', fontWeight:'700', boxShadow:'0 4px 12px rgba(0,0,0,0.3)', zIndex: 100, color:'#0f172a'}}>CLOSE CAMERA</button>
               </div>
             )}
          </div>
        )}

        {scanResult && (
          <div style={{...styles.card, borderTop:'6px solid #059669'}}>
            <div style={{textAlign:'center', marginBottom:'32px'}}>
              <h2 style={{fontSize:'1.75rem', margin:'12px 0', color:'#0f172a'}}>{scanResult.name}</h2>
              <p style={{fontSize:'1.1rem', color:'#475569', fontWeight:'600'}}>{scanResult.regNo}</p>
              <div style={{...styles.badge, background:'#f1f5f9', color:'#475569', display:'inline-block', marginTop:'12px'}}>Room {scanResult.room}</div>
            </div>
            {checkCurfew() && (
               <div style={{...styles.badge, width:'100%', textAlign:'center', padding:'14px', marginBottom:'24px', fontSize:'0.9rem', background: scanResult.isApproved ? '#ecfdf5' : '#fef2f2', color: scanResult.isApproved ? '#059669' : '#dc2626', display:'block'}}>
                 {scanResult.isApproved ? 'LATE ENTRY APPROVED (ONE TIME)' : 'LATE ENTRY - NO PERMISSION'}
               </div>
            )}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>
              <button style={{...styles.btnMain, ...styles.btnGreen}} onClick={()=>logAction('entry')}>ENTRY <LogIn size={20}/></button>
              <button style={{...styles.btnMain, ...styles.btnRed}} onClick={()=>logAction('exit')}>EXIT <LogOutIcon size={20}/></button>
            </div>
            <button style={{...styles.btnMain, ...styles.btnGhost, marginTop:'16px', border:'1px solid #e2e8f0'}} onClick={cancelScan}>Cancel Scan</button>
          </div>
        )}

        {tab === 'alerts' && (
           <div>
             <h3 style={{marginBottom:'20px', color:'#0f172a'}}>System Alerts</h3>
             {announcements.map((a,i) => (
               <div key={i} style={styles.card}>
                 <p style={{fontWeight:'600', fontSize:'1.1rem', color:'#0f172a', marginBottom:'8px'}}>{a.message}</p>
                 <span style={{...styles.badge, background:'#f1f5f9', color:'#64748b'}}>Target: {a.target}</span>
               </div>
             ))}
           </div>
        )}
      </div>

      <div style={styles.nav}>
        <button style={{...styles.navBtn, color: tab==='scan'?'#059669':'#94a3b8'}} onClick={()=>setTab('scan')}><ScanLine size={26}/>Scan</button>
        <button style={{...styles.navBtn, color: tab==='alerts'?'#059669':'#94a3b8'}} onClick={()=>setTab('alerts')}><Bell size={26}/>Alerts</button>
      </div>
    </div>
  );
}

// --- WARDEN DASHBOARD ---
function WardenDash({ user }) {
  const [tab, setTab] = useState('reqs');
  const [reqs, setReqs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState('');
  const [foundStudent, setFoundStudent] = useState(null);
  const [msg, setMsg] = useState('');
  const [target, setTarget] = useState('All');

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, "requests"), orderBy("timestamp", "desc")), s => setReqs(s.docs.map(d=>({id:d.id, ...d.data()}))));
    const u2 = onSnapshot(query(collection(db, "logs"), orderBy("timestamp", "desc"), limit(20)), s => setLogs(s.docs.map(d=>d.data())));
    const u3 = onSnapshot(query(collection(db, "tickets"), orderBy("timestamp", "desc")), s => setTickets(s.docs.map(d=>({id:d.id, ...d.data()}))));
    return () => { u1(); u2(); u3(); };
  }, []);

  const handleApprove = async (id) => await updateDoc(doc(db, "requests", id), { status: 'approved' });
  const handleReject = async (id) => await updateDoc(doc(db, "requests", id), { status: 'rejected' });
  const resolveTicket = async (id) => await updateDoc(doc(db, "tickets", id), { status: 'Resolved' });
  const postMsg = async () => { await addDoc(collection(db, "announcements"), { message: msg, target, timestamp: serverTimestamp() }); setMsg(''); alert('Posted'); };
  
  const checkStatus = async () => {
    const q = query(collection(db, "logs"), where("regNo", "==", search), orderBy("timestamp", "desc"), limit(1));
    const s = await getDocs(q); 
    
    if(s.empty) {
      setFoundStudent({status:'No Data', name: 'Unknown', time: '-'});
    } else { 
      const d = s.docs[0].data(); 
      const isInside = d.type === 'entry';
      setFoundStudent({ name: d.name, status: isInside ? 'INSIDE HOSTEL' : 'OUTSIDE CAMPUS', time: d.timestamp?.toDate().toLocaleString(), isInside }); 
    }
  };

  return (
    <div style={{...styles.container, background:'#ffffff', color:'#0f172a'}}> 
      <header style={{...styles.header, background:'#ffffff', borderBottom:'1px solid #e2e8f0'}}>
        <div><h1 style={{fontSize:'1.25rem', fontWeight:'800', margin:0, color:'#0f172a'}}>Warden Console</h1><p style={{margin:0, fontSize:'0.85rem', color:'#64748b'}}>Admin Control</p></div>
        <button onClick={()=>signOut(auth)} style={{border:'none', background:'#fee2e2', padding:'8px', borderRadius:'50%', cursor:'pointer'}}><LogOut color="#dc2626" size={20}/></button>
      </header>

      <div style={{padding:'24px', paddingBottom:'100px'}}>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'24px'}}>
           <div style={{...styles.card, background:'#0f172a', color:'white', border:'none', padding:'20px', marginBottom:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
             <h2 style={{fontSize:'2.5rem', margin:0, fontWeight:'700', color:'white'}}>{reqs.filter(r=>r.status==='pending').length}</h2>
             <p style={{color:'#94a3b8', fontSize:'0.75rem', fontWeight:'700', letterSpacing:'1px', marginTop:'4px'}}>PENDING REQS</p>
           </div>
           <div style={{...styles.card, background:'#ffffff', border:'1px solid #e2e8f0', padding:'20px', marginBottom:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
             <h2 style={{fontSize:'2.5rem', margin:0, fontWeight:'700', color:'#0f172a'}}>{tickets.filter(t=>t.status==='Open').length}</h2>
             <p style={{color:'#64748b', fontSize:'0.75rem', fontWeight:'700', letterSpacing:'1px', marginTop:'4px'}}>OPEN TICKETS</p>
           </div>
        </div>

        {tab === 'reqs' && (
           <div>
             <h3 style={{color:'#0f172a', marginBottom:'16px'}}>Late Requests</h3>
             {reqs.filter(r=>r.status==='pending').map(r => (
               <div key={r.id} style={{...styles.card, borderLeft:'4px solid #f59e0b'}}>
                 <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}><strong style={{color:'#0f172a', fontSize:'1.1rem'}}>{r.name}</strong><span style={{...styles.badge, background:'#f1f5f9', color:'#475569'}}>{r.regNo}</span></div>
                 <p style={{fontSize:'1rem', color:'#334155', marginBottom:'16px'}}>Reason: {r.reason}</p>
                 <div style={{display:'flex', gap:'12px'}}>
                   <button style={{...styles.btnMain, ...styles.btnGreen, padding:'10px', fontSize:'0.85rem'}} onClick={()=>handleApprove(r.id)}>Approve</button>
                   <button style={{...styles.btnMain, ...styles.btnRed, padding:'10px', fontSize:'0.85rem'}} onClick={()=>handleReject(r.id)}>Reject</button>
                 </div>
               </div>
             ))}
           </div>
        )}

        {tab === 'tickets' && (
          <div>
            <h3 style={{color:'#0f172a', marginBottom:'16px'}}>Maintenance Tickets</h3>
            {tickets.map(t => (
              <div key={t.id} style={styles.card}>
                 <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                   <div>
                     <span style={{fontSize:'0.75rem', fontWeight:'700', color:'#94a3b8'}}>#{t.id.substring(0,4).toUpperCase()} • {t.room}</span>
                     <h4 style={{margin:'4px 0', fontSize:'1.1rem', color:'#0f172a'}}>{t.title}</h4>
                     <p style={{margin:0, color:'#475569'}}>{t.desc}</p>
                     <p style={{fontSize:'0.85rem', color:'#2563eb', fontWeight:'600', marginTop:'8px'}}>{t.name}</p>
                   </div>
                   {t.status === 'Open' ? (
                     <button style={{...styles.btnMain, ...styles.btnBlue, width:'auto', padding:'8px 16px', fontSize:'0.8rem'}} onClick={()=>resolveTicket(t.id)}>Resolve</button>
                   ) : (
                     <span style={{...styles.badge, background:'#f0fdf4', color:'#15803d'}}>Resolved</span>
                   )}
                 </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'logs' && (
           <div>
             <div style={styles.card}>
               <h4 style={{color:'#0f172a', marginTop:0}}>Student Lookup</h4>
               <div style={{display:'flex', gap:'12px'}}>
                 <input style={{...styles.input, marginBottom:0}} placeholder="Enter Reg No" value={search} onChange={e=>setSearch(e.target.value)}/>
                 <button style={{...styles.btnMain, width:'auto', background:'#0f172a', color:'white'}} onClick={checkStatus}><Search/></button>
               </div>
               {foundStudent && <div style={{marginTop:'16px', padding:'16px', background:'#f8fafc', borderRadius:'12px', border:'1px solid #e2e8f0'}}>
                  {foundStudent.name !== 'Unknown' ? 
                    <>
                       <strong style={{color:'#0f172a', fontSize:'1.1rem'}}>{foundStudent.name}</strong>
                       <div style={{marginTop:'4px', color: foundStudent.isInside ? '#166534' : '#dc2626', fontWeight:'800', fontSize:'1rem'}}>
                         {foundStudent.status}
                       </div>
                       <small style={{color:'#64748b'}}>Last Log: {foundStudent.time}</small>
                    </> 
                  : <span style={{color:'#64748b'}}>No logs found for this ID</span>}
               </div>}
             </div>
             <h3 style={{color:'#0f172a', margin:'24px 0 16px'}}>Log History</h3>
             {logs.map((l, i) => (
               <div key={i} style={{...styles.card, padding:'16px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px'}}>
                 <div><strong style={{color:'#0f172a'}}>{l.name}</strong><br/><small style={{color:'#64748b'}}>{new Date(l.timestamp?.toDate()).toLocaleTimeString()}</small></div>
                 <span style={{...styles.badge, background: l.type==='entry'?'#ecfdf5':'#fef2f2', color: l.type==='entry'?'#059669':'#dc2626'}}>{l.type.toUpperCase()}</span>
               </div>
             ))}
           </div>
        )}

        {tab === 'post' && (
           <div style={styles.card}>
             <h3 style={{color:'#0f172a', marginTop:0}}>New Announcement</h3>
             <select style={styles.input} value={target} onChange={e=>setTarget(e.target.value)}>
                <option value="All">All Students</option>
                <option value="A">Block A</option>
                <option value="B">Block B</option>
             </select>
             <textarea style={{...styles.input, resize:'none', height:'120px'}} placeholder="Message content..." value={msg} onChange={e=>setMsg(e.target.value)}/>
             <button style={{...styles.btnMain, background:'#0f172a', color:'white'}} onClick={postMsg}>Post Message</button>
           </div>
        )}
      </div>

      <div style={styles.nav}>
        <button style={{...styles.navBtn, color: tab==='reqs'?'#0f172a':'#94a3b8'}} onClick={()=>setTab('reqs')}><Clock size={26}/>Reqs</button>
        <button style={{...styles.navBtn, color: tab==='tickets'?'#0f172a':'#94a3b8'}} onClick={()=>setTab('tickets')}><Ticket size={26}/>Tickets</button>
        <button style={{...styles.navBtn, color: tab==='logs'?'#0f172a':'#94a3b8'}} onClick={()=>setTab('logs')}><History size={26}/>Logs</button>
        <button style={{...styles.navBtn, color: tab==='post'?'#0f172a':'#94a3b8'}} onClick={()=>setTab('post')}><Bell size={26}/>Post</button>
      </div>
    </div>
  );
}

// --- APP WRAPPER ---
export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setUser(u);
    if(u) { const s = await getDoc(doc(db, "users", u.uid)); if(s.exists()) setUserData({...s.data(), uid:u.uid}); }
    else setUserData(null);
    setLoading(false);
  }), []);

  if (loading) return <div style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748b'}}>Loading HallPass...</div>;
  if (!user || !userData) return <Auth />;
  if (userData.role === 'guard') return <GuardDash user={userData} />;
  if (userData.role === 'admin') return <WardenDash user={userData} />;
  return <StudentDash user={userData} />;
}