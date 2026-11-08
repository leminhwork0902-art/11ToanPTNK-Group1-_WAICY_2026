import { PoseTracker } from './components/PoseTracker';

function App() {
  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', padding: '20px', color: '#fff' }}>
      <header style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1>LifeAssist AI - Core Vision Engine</h1>
        <p>Real-time 33 Landmarks & Posture Detection</p>
      </header>
      <main>
        <PoseTracker />
      </main>
    </div>
  );
}

export default App;