import React, { useState, useEffect } from 'react';

import { createRoot } from 'react-dom/client';



const App: React.FC = () => {
  const [message, setMessage] = useState<string>('');

  const handleConnect = () => {
    // Envia mensagem ao backend para conectar via HID
    window.electronAPI.connectHID();

  };

  useEffect(() => {
    // Escuta para conexão bem-sucedidaW
    const onHIDConnected = (msg: string) => {
      setMessage(msg);
    };

    // Escuta para erro de conexão
    const onHIDError = (msg: string) => {
      setMessage(`Erro: ${msg}`);
    };

    // Registrando os listeners
    window.electronAPI.onHIDConnected(onHIDConnected);
    window.electronAPI.onHIDError(onHIDError);

    // Cleanup para evitar múltiplos listeners ao desmontar o componente
    return () => {
      window.electronAPI.onHIDConnected(() => {});
      window.electronAPI.onHIDError(() => {});
    };
  }, []);

  return (
    <div style={{ textAlign: 'center', marginTop: '20px' }}>
      <h1>Conectar Wacom STU-540</h1>
      <button onClick={handleConnect} style={{ padding: '10px 20px', fontSize: '16px' }}>
        Conectar
      </button>
      {message && (
        <p style={{ marginTop: '20px', fontSize: '18px', color: message.includes('Erro') ? 'red' : 'green' }}>
          {message}
        </p>
      )}
    </div>
  );
};

export default App;

const container = document.getElementById('root') as HTMLElement
const root = createRoot(container);

root.render(<App/>)