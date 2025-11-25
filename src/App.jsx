import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from './firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, collection, addDoc, query, onSnapshot, updateDoc, where, orderBy, limit, serverTimestamp } from 'firebase/firestore';

// --- FIXED IMPORTS ---
import QRCode from 'react-qr-code'; // Matches your package.json
import { Scanner } from '@yudiel/react-qr-scanner'; // The new, working scanner library

import { Shield, User, LogOut, Plus, CheckCircle, Clock, AlertTriangle, ChevronRight, MessageSquare, Bell, ScanLine, LogIn, LogOut as LogOutIcon, Search, History, Home, QrCode, Ticket } from 'lucide-react';

const CURFEW_HOUR = 22; // 10 PM
const CURFEW_END = 4;   // 4 AM

// Helper to check if currently in curfew hours
const checkCurfew = () => {
  const h = new Date().getHours();
  return h >= CURFEW_HOUR || h < CURFEW_END;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isRegister) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const userData = {
          email, role, name, createdAt: new Date().toISOString(),
          ...(role === 'student' && { regNo, hostel, room }),
          ...(role === 'guard' && { location: 'Main Gate' }),
          ...(role === 'admin' && { designation: 'Warden' })
        };
        await setDoc(doc(db, "users", cred.user.uid), userData);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) { setError(err.message.replace('Firebase:', '')); }
  };

  return (
    <div className="auth-container" style={{padding:'20px', display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#f8fafc'}}>
      <div className="app-card" style={{width:'100%', maxWidth:'400px', borderTop:'6px solid #0055ff'}}>
        <div style={{textAlign:'center', marginBottom:'30px'}}>
          <h1 style={{fontSize:'2.5rem', color:'#111', fontWeight:'900'}}>HallPass</h1>
          <p style={{color:'#666', fontWeight:'600'}}>Campus Access Control</p>
        </div>

        <div style={{display:'flex', background:'#eee', padding:'6px', borderRadius:'16px', marginBottom:'24px'}}>
          {['student', 'guard', 'admin'].map(r => (
            <button key={r} onClick={()=>setRole(r)} style={{flex:1, padding:'12px', border:'none', background: role===r?'white':'transparent', borderRadius:'12px', fontWeight:'800', color: role===r?'#0055ff':'#888', boxShadow: role===r?'0 4px 12px rgba(0,0,0,0.1)':'none', cursor:'pointer', textTransform:'capitalize'}}>
              {r}
            </button>
          ))}
        </div>

        {error && <div style={{padding:'12px', background:'#fee2e2', color:'#d50000', borderRadius:'12px', marginBottom:'20px', fontWeight:'bold', border:'1px solid #ffcdd2'}}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {isRegister && <input className="input-clean" placeholder="Full Name" onChange={e => setName(e.target.value)} required />}
          {isRegister && role === 'student' && (
            <>
              <input className="input-clean" placeholder="Reg No (e.g. RA211...)" onChange={e => setRegNo(e.target.value)} required />
              <div style={{display:'flex', gap:'12px'}}>
                <input className="input-clean" placeholder="Hostel (A)" onChange={e => setHostel(e.target.value)} required />
                <input className="input-clean" placeholder="Room (101)" onChange={e => setRoom(e.target.value)} required />
              </div>
            </>
          )}
          <input className="input-clean" type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} required />
          <input className="input-clean" type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} required />
          <button type="submit" className="btn-main btn-blue">
            {isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>
        <p onClick={()=>setIsRegister(!isRegister)} style={{textAlign:'center', marginTop:'24px', color:'#0055ff', fontWeight:'800', cursor:'pointer', textDecoration:'underline'}}>
          {isRegister ? 'Have an account? Login' : 'Create Account'}
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

  useEffect(() => {
    const timer = setInterval(() => setIsCurfew(checkCurfew()), 60000);

    const unsubReq = onSnapshot(query(collection(db, "requests"), where("uid", "==", user.uid), where("status", "in", ["pending", "approved"])), 
      snap => {
        if (!snap.empty) setLateStatus(snap.docs[0].data());
        else setLateStatus(null);
      }
    );
    
    const unsubAnn = onSnapshot(query(collection(db, "announcements"), orderBy("timestamp", "desc")), snap => setAnnouncements(snap.docs.map(d=>d.data()).filter(m => m.target === 'All' || m.target === user.hostel)));
    
    const unsubTick = onSnapshot(query(collection(db, "tickets"), where("uid", "==", user.uid)), snap => {
      const sortedTickets = snap.docs.map(d=>({id: d.id, ...d.data()}))
        .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setTickets(sortedTickets);
    });

    return () => { clearInterval(timer); unsubReq(); unsubAnn(); unsubTick(); };
  }, [user]);

  const qrData = JSON.stringify({ uid: user.uid, regNo: user.regNo, name: user.name, hostel: user.hostel, room: user.room });
  
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
  };

  return (
    <div className="app-container">
      <div className="glass-header">
        <div><h1>{user.name}</h1><p>{user.regNo} • {user.hostel}-{user.room}</p></div>
        <button onClick={()=>signOut(auth)} style={{border:'none', background:'none'}}><LogOut color="#ff0040" size={24}/></button>
      </div>

      <div className="content-scroll">
        {tab === 'home' && (
          <>
            <div className="app-card" style={{textAlign:'center', borderTop:'6px solid #0055ff'}}>
              <p style={{fontSize:'0.8rem', fontWeight:'800', color:'#888', letterSpacing:'1px', marginBottom:'20px'}}>DIGITAL ACCESS KEY</p>
              <div style={{background:'white', padding:'20px', borderRadius:'20px', border:'3px dashed #bbb', display:'inline-block', marginBottom:'20px'}}>
                <QRCode value={qrData} size={180} />
              </div>
              <h2 style={{margin:'0 0 10px', fontSize:'2rem'}}>{user.room}</h2>
              <div className={`badge ${isCurfew ? 'late' : 'ok'}`} style={{display:'inline-block', fontSize:'0.9rem'}}>
                {isCurfew ? 'CURFEW ACTIVE (10 PM - 4 AM)' : 'ACCESS GRANTED'}
              </div>
            </div>
            {lateStatus && (
              <div className="app-card" style={{background:'#fff3e0', border:'2px solid #ffb74d'}}>
                 <h3 style={{color:'#e65100', marginTop:0}}>Request: {lateStatus.status.toUpperCase()}</h3>
                 <p style={{marginBottom:0, fontWeight:'600'}}>Reason: {lateStatus.reason}</p>
              </div>
            )}
            {!lateStatus && (
              <button onClick={requestLate} className="btn-main btn-ghost">Request Late Entry <ChevronRight /></button>
            )}
          </>
        )}

        {tab === 'notice' && (
          <div>
            <h3 style={{marginBottom:'20px', color:'black'}}>Notice Board</h3>
            {announcements.map((a, i) => (
              <div key={i} className="app-card" style={{borderLeft: `6px solid ${a.target==='All'?'#0055ff':'#e91e63'}`}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                  <span className="badge gray">{a.target} Students</span>
                  <span style={{fontSize:'0.7rem', fontWeight:'bold', color:'#888'}}>Today</span>
                </div>
                <p style={{margin:0, fontWeight:'600', fontSize:'1.05rem', lineHeight:'1.5'}}>{a.message}</p>
              </div>
            ))}
          </div>
        )}
        
        {tab === 'help' && (
           <div>
             <div className="app-card" onClick={()=>setModalOpen(true)} style={{cursor:'pointer', border:'2px dashed #0055ff', background:'#f0f7ff'}}>
               <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                 <div style={{background:'#0055ff', padding:'10px', borderRadius:'12px'}}><Plus color="white"/></div>
                 <div><h3 style={{margin:0, color:'#0055ff'}}>Create Ticket</h3><p style={{margin:0, fontSize:'0.8rem', fontWeight:'600', color:'#666'}}>Maintenance & Repairs</p></div>
               </div>
             </div>
             
             <h3 style={{margin:'30px 0 15px', color:'black'}}>My Tickets</h3>
             {tickets.length === 0 && <p style={{textAlign:'center', color:'#888'}}>No tickets found.</p>}
             {tickets.map(t => (
               <div key={t.id} className="app-card" style={{padding:'16px'}}>
                 <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                   <div>
                      <span style={{fontSize:'0.75rem', color:'#888', fontWeight:'bold'}}>ID: #{t.id.substring(0,4).toUpperCase()}</span>
                      <h4 style={{margin:'4px 0', fontSize:'1.1rem'}}>{t.title}</h4>
                      <p style={{margin:0, color:'#555', fontSize:'0.9rem'}}>{t.desc}</p>
                   </div>
                   <span className={`badge ${t.status==='Open'?'late':'ok'}`}>{t.status}</span>
                 </div>
               </div>
             ))}
           </div>
        )}
      </div>

      <div className="bottom-nav">
        <button className={`nav-btn ${tab==='home'?'active':''}`} onClick={()=>setTab('home')}><Home size={28}/>Home</button>
        <button className={`nav-btn ${tab==='notice'?'active':''}`} onClick={()=>setTab('notice')}><Bell size={28}/>Notice</button>
        <button className={`nav-btn ${tab==='help'?'active':''}`} onClick={()=>setTab('help')}><MessageSquare size={28}/>Help</button>
      </div>

      {modalOpen && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
          <div className="app-card" style={{width:'100%'}}>
            <h2 style={{marginTop:0}}>New Ticket</h2>
            <input className="input-clean" placeholder="Issue Title (e.g. Broken Fan)" value={ticket.title} onChange={e=>setTicket({...ticket, title:e.target.value})}/>
            <textarea className="input-clean" rows={4} placeholder="Description..." value={ticket.desc} onChange={e=>setTicket({...ticket, desc:e.target.value})}/>
            <div style={{display:'flex', gap:'10px'}}>
              <button className="btn-main btn-ghost" onClick={()=>setModalOpen(false)}>Cancel</button>
              <button className="btn-main btn-blue" onClick={submitTicket}>Submit</button>
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
  
  // CRITICAL: Lock the scanner after a read until manually reset
  const scanLock = useRef(false);

  useEffect(() => { onSnapshot(query(collection(db, "announcements"), orderBy("timestamp", "desc")), snap => setAnnouncements(snap.docs.map(d=>d.data()))); }, []);

  const handleScan = async (data) => {
    // Block if already locked or no data
    if (data && !scanLock.current) {
      scanLock.current = true; // LOCK IMMEDIATELY
      setScanning(false); // STOP CAMERA UI
      
      try {
        const student = JSON.parse(data);
        
        const q = query(
            collection(db, "requests"), 
            where("uid", "==", student.uid), 
            where("status", "==", "approved"),
            limit(1)
        );
        const snap = await getDocs(q);
        
        const requestData = !snap.empty ? { ...snap.docs[0].data(), reqId: snap.docs[0].id } : null;
        
        setScanResult({ 
          ...student, 
          isApproved: !!requestData,
          requestId: requestData?.reqId 
        });
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
      uid: scanResult.uid, 
      name: scanResult.name, 
      regNo: scanResult.regNo, 
      type, 
      timestamp: serverTimestamp(), 
      isLate: (type === 'entry' && isLate), 
      approved: scanResult.isApproved, 
      guardId: user.uid 
    });

    if (scanResult.requestId) {
      await updateDoc(doc(db, "requests", scanResult.requestId), { status: 'closed' });
    }

    alert(`Logged ${type.toUpperCase()}`); 
    
    // CLEANUP
    setScanResult(null);
    // DO NOT reset scanLock here. Guard must manually click "Open Scanner"
  };

  // Function to handle manual reset
  const cancelScan = () => {
    setScanResult(null);
    setScanning(false);
    // DO NOT reset scanLock here either. 
  };

  const startScanning = () => {
    scanLock.current = false; // Unlock ONLY here
    setScanning(true);
  };

  return (
    <div className="app-container">
      <div className="glass-header" style={{borderBottomColor:'#00c853'}}>
        <div><h1 style={{color:'#00c853'}}>Guard Panel</h1><p>Main Gate</p></div>
        <button onClick={()=>signOut(auth)}><LogOut color="#ff0040"/></button>
      </div>

      <div className="content-scroll">
        {tab === 'scan' && !scanResult && (
          <div className="app-card" style={{textAlign:'center', padding:'40px 20px'}}>
             {!scanning ? (
               <>
                 <div style={{background:'#e8f5e9', width:'100px', height:'100px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 30px'}}>
                   <QrCode size={50} color="#00c853"/>
                 </div>
                 <h2 style={{fontSize:'1.8rem'}}>Scan Entry Pass</h2>
                 <p style={{color:'#666', marginBottom:'40px', fontWeight:'600'}}>Tap below to open camera</p>
                 <button className="btn-main btn-green" onClick={startScanning}>Open Scanner</button>
               </>
             ) : (
               <div className="scanner-viewport">
                 {/* NEW SCANNER COMPONENT: 
                     Uses @yudiel/react-qr-scanner which handles React 18 strict mode correctly.
                     We access the raw value from the result array.
                 */}
                 <div style={{width:'100%', maxWidth:'400px', margin:'0 auto', borderRadius:'12px', overflow:'hidden'}}>
                    <Scanner 
                        onScan={(result) => { 
                            if (result && result.length > 0) handleScan(result[0].rawValue); 
                        }}
                    />
                 </div>
                 
                 <button onClick={()=>setScanning(false)} style={{position:'absolute', bottom:'20px', left:'50%', transform:'translateX(-50%)', background:'white', border:'none', padding:'10px 24px', borderRadius:'20px', fontWeight:'800', boxShadow:'0 4px 10px rgba(0,0,0,0.5)', zIndex: 100}}>CANCEL</button>
               </div>
             )}
          </div>
        )}

        {scanResult && (
          <div className="app-card" style={{borderTop:'6px solid #00c853'}}>
            <div style={{textAlign:'center', marginBottom:'30px'}}>
              <h2 style={{fontSize:'2rem', margin:'10px 0'}}>{scanResult.name}</h2>
              <p style={{fontSize:'1.2rem', color:'#555', fontWeight:'600'}}>{scanResult.regNo}</p>
              <div className="badge gray" style={{marginTop:'10px', fontSize:'1rem'}}>Room {scanResult.room}</div>
            </div>
            {checkCurfew() && (
               <div className={`badge ${scanResult.isApproved?'ok':'late'}`} style={{width:'100%', textAlign:'center', padding:'12px', marginBottom:'24px', fontSize:'0.9rem'}}>
                 {scanResult.isApproved ? 'LATE ENTRY APPROVED (ONE TIME)' : 'LATE ENTRY - NO PERMISSION'}
               </div>
            )}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
              <button className="btn-main btn-green" onClick={()=>logAction('entry')}>ENTRY <LogIn size={20}/></button>
              <button className="btn-main btn-red" onClick={()=>logAction('exit')}>EXIT <LogOutIcon size={20}/></button>
            </div>
            <button className="btn-main btn-ghost" style={{marginTop:'20px', color:'#555', borderColor:'#ddd'}} onClick={cancelScan}>Cancel</button>
          </div>
        )}

        {tab === 'alerts' && (
           <div><h3>Alerts</h3>{announcements.map((a,i) => <div key={i} className="app-card"><p style={{fontWeight:'700', fontSize:'1.1rem'}}>{a.message}</p><p style={{color:'#666'}}>Target: {a.target}</p></div>)}</div>
        )}
      </div>

      <div className="bottom-nav">
        <button className={`nav-btn guard-theme ${tab==='scan'?'active':''}`} onClick={()=>setTab('scan')}><ScanLine size={28}/>Scan</button>
        <button className={`nav-btn guard-theme ${tab==='alerts'?'active':''}`} onClick={()=>setTab('alerts')}><Bell size={28}/>Alerts</button>
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
      setFoundStudent({
        name: d.name, 
        status: isInside ? 'INSIDE HOSTEL' : 'OUTSIDE CAMPUS', 
        time: d.timestamp?.toDate().toLocaleString(),
        isInside: isInside
      }); 
    }
  };

  return (
    <div className="app-container">
      <div className="glass-header" style={{borderBottomColor:'#111'}}>
        <div><h1 style={{color:'#111'}}>Warden Console</h1><p>Admin Control</p></div>
        <button onClick={()=>signOut(auth)}><LogOut color="#ff0040"/></button>
      </div>

      <div className="content-scroll">
        <div style={{display:'flex', gap:'12px', overflowX:'auto', paddingBottom:'10px'}}>
           <div className="app-card" style={{minWidth:'120px', textAlign:'center', margin:0, background:'#111', color:'white', border:'none'}}>
             <h2 style={{fontSize:'2rem', margin:0}}>{reqs.filter(r=>r.status==='pending').length}</h2><p style={{color:'#aaa', fontSize:'0.75rem', fontWeight:'bold', letterSpacing:'1px'}}>PENDING</p>
           </div>
           <div className="app-card" style={{minWidth:'120px', textAlign:'center', margin:0, border:'2px solid #111'}}>
             <h2 style={{fontSize:'2rem', margin:0, color:'#111'}}>{tickets.filter(t=>t.status==='Open').length}</h2><p style={{color:'#666', fontSize:'0.75rem', fontWeight:'bold', letterSpacing:'1px'}}>TICKETS</p>
           </div>
        </div>

        {tab === 'reqs' && (
           <div style={{marginTop:'20px'}}>
             <h3>Late Requests</h3>
             {reqs.filter(r=>r.status==='pending').map(r => (
               <div key={r.id} className="app-card" style={{borderLeft:'5px solid #ff9800'}}>
                 <div style={{display:'flex', justifyContent:'space-between'}}><strong>{r.name}</strong><span className="badge gray">{r.regNo}</span></div>
                 <p style={{fontSize:'1rem', color:'#444'}}>Reason: {r.reason}</p>
                 <div style={{display:'flex', gap:'10px', marginTop:'15px'}}>
                   <button className="btn-main btn-green" style={{padding:'10px', fontSize:'0.8rem'}} onClick={()=>handleApprove(r.id)}>Approve</button>
                   <button className="btn-main btn-red" style={{padding:'10px', fontSize:'0.8rem'}} onClick={()=>handleReject(r.id)}>Reject</button>
                 </div>
               </div>
             ))}
           </div>
        )}

        {tab === 'tickets' && (
          <div style={{marginTop:'20px'}}>
            <h3>Maintenance Tickets</h3>
            {tickets.map(t => (
              <div key={t.id} className="app-card">
                 <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                   <div>
                     <span style={{fontSize:'0.75rem', fontWeight:'bold', color:'#888'}}>#{t.id.substring(0,4).toUpperCase()} • {t.room}</span>
                     <h4 style={{margin:'4px 0', fontSize:'1.1rem'}}>{t.title}</h4>
                     <p style={{margin:0, color:'#555'}}>{t.desc}</p>
                     <p style={{fontSize:'0.8rem', color:'#0055ff', fontWeight:'bold', marginTop:'6px'}}>{t.name}</p>
                   </div>
                   {t.status === 'Open' ? (
                     <button className="btn-main btn-blue" style={{width:'auto', padding:'8px 16px', fontSize:'0.75rem'}} onClick={()=>resolveTicket(t.id)}>Resolve</button>
                   ) : (
                     <span className="badge ok">Resolved</span>
                   )}
                 </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'logs' && (
           <div style={{marginTop:'20px'}}>
             <div className="app-card">
               <h4>Student Lookup</h4>
               <div style={{display:'flex', gap:'10px'}}>
                 <input className="input-clean" placeholder="Enter Reg No" value={search} onChange={e=>setSearch(e.target.value)} style={{marginBottom:0}}/>
                 <button className="btn-main btn-dark" style={{width:'auto'}} onClick={checkStatus}><Search/></button>
               </div>
               {foundStudent && <div style={{marginTop:'15px', padding:'15px', background:'#eee', borderRadius:'12px'}}>
                  {foundStudent.name !== 'Unknown' ? 
                    <>
                       <strong>{foundStudent.name}</strong>
                       <div style={{marginTop:'5px', color: foundStudent.isInside ? '#00c853' : '#d50000', fontWeight:'800', fontSize:'1.1rem'}}>
                         {foundStudent.status}
                       </div>
                       <small style={{color:'#666'}}>Last Log: {foundStudent.time}</small>
                    </> 
                  : 'No logs found for this ID'}
               </div>}
             </div>
             <h3>Log History</h3>
             {logs.map((l, i) => (
               <div key={i} className="app-card" style={{padding:'16px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                 <div><strong>{l.name}</strong><br/><small style={{color:'#666'}}>{new Date(l.timestamp?.toDate()).toLocaleTimeString()}</small></div>
                 <span className={`badge ${l.type==='entry'?'ok':'late'}`}>{l.type.toUpperCase()}</span>
               </div>
             ))}
           </div>
        )}

        {tab === 'post' && (
           <div className="app-card" style={{marginTop:'20px'}}>
             <h3>New Announcement</h3>
             <select className="input-clean" value={target} onChange={e=>setTarget(e.target.value)}><option value="All">All Students</option><option value="A">Block A</option><option value="B">Block B</option></select>
             <textarea className="input-clean" rows={4} placeholder="Message" value={msg} onChange={e=>setMsg(e.target.value)}/>
             <button className="btn-main btn-dark" onClick={postMsg}>Post Message</button>
           </div>
        )}
      </div>

      <div className="bottom-nav">
        <button className={`nav-btn warden-theme ${tab==='reqs'?'active':''}`} onClick={()=>setTab('reqs')}><Clock size={28}/>Reqs</button>
        <button className={`nav-btn warden-theme ${tab==='tickets'?'active':''}`} onClick={()=>setTab('tickets')}><Ticket size={28}/>Tickets</button>
        <button className={`nav-btn warden-theme ${tab==='logs'?'active':''}`} onClick={()=>setTab('logs')}><History size={28}/>Logs</button>
        <button className={`nav-btn warden-theme ${tab==='post'?'active':''}`} onClick={()=>setTab('post')}><Bell size={28}/>Post</button>
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

  if (loading) return <div style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>Loading...</div>;
  if (!user || !userData) return <Auth />;
  if (userData.role === 'guard') return <GuardDash user={userData} />;
  if (userData.role === 'admin') return <WardenDash user={userData} />;
  return <StudentDash user={userData} />;
}