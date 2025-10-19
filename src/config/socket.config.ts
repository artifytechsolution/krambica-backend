import { Server } from 'socket.io';

export function initSocket(server: any) {
  const io = new Server(server, {
    cors: {
      origin: '*', // allow your frontend origin
      methods: ['GET', 'POST'],
    },
  });

  const stockNamespace = io.of('/stock');

  stockNamespace.on('connection', (socket) => {
    console.log('✅ Client connected to /stock namespace');

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected from /stock namespace');
    });
  });

  return stockNamespace;
}
