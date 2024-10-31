<template>
    <div id="login">
      <h2>Login</h2>
      <form @submit.prevent="login">
        <div>
          <label for="username">Username:</label>
          <input type="text" id="username" v-model="username" required />
        </div>
        <div>
          <label for="password">Password:</label>
          <input type="password" id="password" v-model="password" required />
        </div>
        <button type="submit">Login</button>
      </form>
      <p v-if="error">{{ error }}</p>
    </div>
  </template>
  
  <script>
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  
  export default {
    name: 'Login',
    setup() {
      const username = ref('');
      const password = ref('');
      const error = ref('');
      const router = useRouter();
  
      const login = async () => {
        try {
          const response = await fetch('http://localhost:8080/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username.value, password: password.value }),
          });
  
          const data = await response.json();
          if (response.ok && data.auth) {
            localStorage.setItem('token', data.token); 
            router.push('/'); 
          } else {
            error.value = 'Invalid credentials';
          }
        } catch (e) {
          console.error('Login failed:', e);
          error.value = 'Login failed';
        }
      };
  
      return { username, password, error, login };
    },
  };
  </script>
  
  <style scoped>
  #login {
    max-width: 300px;
    margin: auto;
  }
  </style>
  