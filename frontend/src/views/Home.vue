<template>
  <div>
    <h1>Reāllaika datu vizualizācija</h1>
    <div>
      <p>Pašreizējais procents: {{ rangePercent }}%</p>
      <label for="range">Noteikt jaunu procentu (%):</label>
      <input id="range" type="number" v-model.number="newRange" min="0" max="100" />
      <button @click="updateRange">Saglabāt</button>
    </div>
    <line-chart :data="chartData" :key="chartKey"></line-chart>
    <p v-if="isConnected">WebSocket Status: Savienots</p>
    <div v-else>
      <p>WebSocket Status: NAV SAVIENOTS</p>
      <p>{{ lastUpdated }}</p>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
export default {
  name: 'Home',
  setup() {
    const router = useRouter()
    const rangePercent = ref(30);
    const newRange = ref(30);
    const isConnected = ref(false);
    const lastUpdated = ref('');
    const chartData = reactive([]); 

    const chartKey = ref(0);

    let socket;

    const connectWebSocket = () => {
      const token = localStorage.getItem("token")
      if(!token){
        router.push('/login'); 
      }
      socket = new WebSocket(`ws://localhost:8080?token=${token}`);
      socket.onopen = () => {
        isConnected.value = true;
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);

        if (message.type === 'data') {
          const timestamp = new Date(message.timestamp).toLocaleTimeString();
          chartData.push([timestamp, message.value]); 
          
          if (chartData.length > 15) {
            chartData.shift();
          }
          lastUpdated.value = `Pēdējie dati saņemti: ${new Date().toLocaleTimeString()}`; 
          chartKey.value++; 
        } else if (message.type === 'range') {
          rangePercent.value = message.rangePercent;
        }
      };

      socket.onclose = () => {
        isConnected.value = false;
        setTimeout(connectWebSocket, 3000); // Mēģina reconnectot pēc 3sek
      };
    };

    const updateRange = async () => {
      const token = localStorage.getItem("token")
      try {
        await fetch('http://localhost:8080/update-range', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'authorization': token
          },
          body: JSON.stringify({ newRange: newRange.value }),
        });
      } catch (error) {
        console.error('Failed to update range:', error);
      }
    };

    // Connect WebSocket on component mount
    onMounted(connectWebSocket);

    // Clean up the socket connection on component unmount
    onUnmounted(() => {
      if (socket) {
        socket.close();
      }
    });

    return { rangePercent, newRange, isConnected, chartData, chartKey, lastUpdated, updateRange };
  },
};
</script>

