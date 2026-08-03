import axios from 'axios';

async function test() {
  try {
    // Let's perform login first to get a token
    const loginRes = await axios.post('http://localhost:5001/auth/login', {
      email: 'admin@horizons.demo',
      password: 'Password123',
      portal: 'school'
    }).catch(e => {
      return axios.post('http://localhost:5001/auth/login', {
        email: 'superadmin@admissions.com',
        password: 'Password123',
        portal: 'super-admin'
      });
    });
    
    const token = loginRes.data.accessToken;
    const schoolId = loginRes.data.user?.schoolId || '3093ced5-dbae-459e-a13a-9bce0c6ae63a';
    console.log('Login successful! Token length:', token?.length, 'SchoolId:', schoolId);

    const categoriesRes = await axios.get('http://localhost:5001/game-categories', {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-tenant-id': schoolId
      }
    });
    
    console.log('CATEGORIES RESPONSE STATUS:', categoriesRes.status);
    console.log('CATEGORIES RESPONSE DATA:', categoriesRes.data);
  } catch (err: any) {
    console.error('API ERROR:', err.response?.status, err.response?.data || err.message);
  }
}

test();
