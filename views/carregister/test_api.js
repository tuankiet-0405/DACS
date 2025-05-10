// API Test Script
// This script will help test the car registration API separately from the form

const testCarRegistration = async () => {
  // Create a minimal test FormData
  const formData = new FormData();
  
  // Add required fields
  formData.append('brand', 'Toyota');
  formData.append('model', 'Vios');
  formData.append('year', '2020');
  formData.append('seats', '4');
  formData.append('transmission', 'tu_dong');
  formData.append('fuel', 'xang');
  formData.append('license_plate', '30A-12345');
  formData.append('price_per_day', '500000');
  formData.append('description', 'Test car description');
  formData.append('type', 'tu_lai');
  formData.append('location', 'Ha Noi, Viet Nam');
  formData.append('ten_xe', 'Toyota Vios');
  formData.append('mau_xe', 'Đen');
  formData.append('tinh_trang', 'cho_duyet');
  formData.append('features', JSON.stringify(['GPS', 'Bluetooth']));
  
  // Don't add images in this test
  console.log('Testing car registration API with minimal data...');
  
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found. Please log in first.');
      return;
    }
    
    console.log('Token found:', token.substring(0, 15) + '...');
    
    // Test authentication first
    const authTest = await fetch('/api/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!authTest.ok) {
      console.error('Authentication test failed:', await authTest.text());
      console.log('Attempting to log in again...');
      return;
    }
    
    const authData = await authTest.json();
    console.log('Authentication successful. Logged in as:', authData.ho_ten || authData.ten_nguoi_dung || authData.email);
    
    // Now test the API endpoint
    console.log('Making test API request...');
    const response = await fetch('/api/cars/test', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        brand: 'Toyota',
        model: 'Vios',
        year: 2020,
        seats: 4,
        transmission: 'tu_dong',
        fuel: 'xang',
        license_plate: '30A-12345',
        price_per_day: 500000,
        description: 'Test car description',
        type: 'tu_lai',
        location: 'Ha Noi, Viet Nam'
      })
    });
    
    console.log('API Response Status:', response.status, response.statusText);
    const responseText = await response.text();
    console.log('API Response:', responseText);
    
    try {
      const responseJson = JSON.parse(responseText);
      console.log('Parsed JSON Response:', responseJson);
    } catch (e) {
      console.log('Response is not valid JSON');
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Check API endpoint
const testApiEndpoints = async () => {
  try {
    console.log('Checking available API endpoints...');
    
    const endpoints = [
      '/api/cars',
      '/api/cars/test',
      '/api'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        console.log(`Endpoint ${endpoint}: ${response.status} ${response.statusText}`);
      } catch (e) {
        console.log(`Endpoint ${endpoint}: Error - ${e.message}`);
      }
    }
  } catch (error) {
    console.error('API test error:', error);
  }
}

// Run tests
testApiEndpoints()
  .then(() => testCarRegistration())
  .catch(err => console.error('Overall test failure:', err));
