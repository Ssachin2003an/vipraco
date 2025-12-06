import requests
import sys
import json
from datetime import datetime

class VipraCo_API_Tester:
    def __init__(self, base_url="https://vipradesk.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_data = None
        self.organization_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            default_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            default_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=30)

            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ {name} - PASSED")
                try:
                    response_data = response.json()
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ {name} - FAILED")
                print(f"   Expected: {expected_status}, Got: {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "endpoint": endpoint,
                    "error": response.text[:200]
                })
                return False, {}

        except requests.exceptions.RequestException as e:
            print(f"❌ {name} - NETWORK ERROR: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": f"Network error: {str(e)}",
                "endpoint": endpoint
            })
            return False, {}

    def test_health_check(self):
        """Test basic API health"""
        return self.run_test("API Health Check", "GET", "", 200)

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        return self.run_test(
            "Login - Invalid Credentials",
            "POST",
            "login",
            401,
            data={"email": "invalid@test.com", "password": "wrongpassword"}
        )

    def test_login_valid_credentials(self):
        """Test login with valid demo credentials"""
        success, response = self.run_test(
            "Login - Valid Credentials (Rahul Verma)",
            "POST",
            "login",
            200,
            data={"email": "rahul.verma@techcorp.in", "password": "password123"}
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_data = response.get('user')
            self.organization_data = response.get('organization')
            print(f"   ✅ Token received: {self.token[:20]}...")
            print(f"   ✅ User: {self.user_data.get('first_name')} {self.user_data.get('last_name')}")
            print(f"   ✅ Organization: {self.organization_data.get('org_name')}")
            return True
        return False

    def test_login_other_organizations(self):
        """Test login for other organizations to verify multi-tenancy"""
        test_users = [
            {"email": "geeta.devi@mgfab.com", "password": "password123", "org": "MGFab"},
            {"email": "ramesh.iyer@bms.edu", "password": "password123", "org": "BMS Education"}
        ]
        
        for user in test_users:
            success, response = self.run_test(
                f"Login - {user['org']} User",
                "POST",
                "login",
                200,
                data={"email": user["email"], "password": user["password"]}
            )
            if success:
                print(f"   ✅ Multi-tenant login working for {user['org']}")

    def test_profile_without_auth(self):
        """Test profile endpoint without authentication"""
        # Temporarily remove token
        temp_token = self.token
        self.token = None
        success, _ = self.run_test("Profile - No Auth", "GET", "profile", 401)
        self.token = temp_token
        return success

    def test_profile_with_auth(self):
        """Test profile endpoint with authentication"""
        if not self.token:
            print("❌ No token available for profile test")
            return False
            
        success, response = self.run_test("Profile - With Auth", "GET", "profile", 200)
        
        if success and response:
            user = response.get('user', {})
            org = response.get('organization', {})
            print(f"   ✅ Profile data retrieved for {user.get('first_name')} {user.get('last_name')}")
            print(f"   ✅ Organization: {org.get('org_name')}")
        
        return success

    def test_chat_without_auth(self):
        """Test chat endpoint without authentication"""
        temp_token = self.token
        self.token = None
        success, _ = self.run_test(
            "Chat - No Auth", 
            "POST", 
            "chat", 
            401,
            data={"message": "Hello"}
        )
        self.token = temp_token
        return success

    def test_chat_hr_queries(self):
        """Test various HR-related chat queries"""
        if not self.token:
            print("❌ No token available for chat tests")
            return False

        hr_queries = [
            {"query": "What is my employee ID?", "expected_type": "hr_data"},
            {"query": "Show me my leave balance", "expected_type": "hr_data"},
            {"query": "What is my salary?", "expected_type": "hr_data"},
            {"query": "Who is my manager?", "expected_type": "hr_data"},
            {"query": "What are the company policies?", "expected_type": "hr_data"},
            {"query": "What is my role?", "expected_type": "hr_data"}
        ]

        all_passed = True
        for query_data in hr_queries:
            success, response = self.run_test(
                f"Chat HR Query - {query_data['query'][:30]}...",
                "POST",
                "chat",
                200,
                data={"message": query_data["query"]}
            )
            
            if success and response:
                response_type = response.get('type')
                if response_type == query_data['expected_type']:
                    print(f"   ✅ Correct response type: {response_type}")
                    print(f"   ✅ Response: {response.get('response', '')[:100]}...")
                else:
                    print(f"   ⚠️  Expected type: {query_data['expected_type']}, Got: {response_type}")
                    all_passed = False
            else:
                all_passed = False

        return all_passed

    def test_chat_general_ai_query(self):
        """Test general AI query (non-HR)"""
        if not self.token:
            print("❌ No token available for AI chat test")
            return False

        success, response = self.run_test(
            "Chat - General AI Query",
            "POST",
            "chat",
            200,
            data={"message": "What is the capital of France?"}
        )
        
        if success and response:
            response_type = response.get('type')
            if response_type == 'general_ai':
                print(f"   ✅ AI response received: {response.get('response', '')[:100]}...")
                return True
            else:
                print(f"   ⚠️  Expected 'general_ai', got: {response_type}")
        
        return False

    def test_data_isolation(self):
        """Test multi-tenant data isolation"""
        print("\n🔒 Testing Multi-Tenant Data Isolation...")
        
        # Login as different users and verify they only see their own data
        test_cases = [
            {"email": "rahul.verma@techcorp.in", "password": "password123", "org_id": "TECHCORP_IN"},
            {"email": "geeta.devi@mgfab.com", "password": "password123", "org_id": "MGFAB_GLOBAL"}
        ]
        
        isolation_passed = True
        
        for test_case in test_cases:
            # Login as user
            success, login_response = self.run_test(
                f"Data Isolation - Login {test_case['email']}",
                "POST",
                "login",
                200,
                data={"email": test_case["email"], "password": test_case["password"]}
            )
            
            if success:
                temp_token = login_response['token']
                original_token = self.token
                self.token = temp_token
                
                # Test profile access
                success, profile_response = self.run_test(
                    f"Data Isolation - Profile {test_case['email']}",
                    "GET",
                    "profile",
                    200
                )
                
                if success:
                    user_org = profile_response.get('user', {}).get('organization_id')
                    if user_org == test_case['org_id']:
                        print(f"   ✅ Data isolation working - User sees only their org data")
                    else:
                        print(f"   ❌ Data isolation failed - Expected {test_case['org_id']}, got {user_org}")
                        isolation_passed = False
                
                # Restore original token
                self.token = original_token
        
        return isolation_passed

    def print_summary(self):
        """Print test summary"""
        print(f"\n" + "="*60)
        print(f"📊 VIPRACO API TEST SUMMARY")
        print(f"="*60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ FAILED TESTS:")
            for i, test in enumerate(self.failed_tests, 1):
                print(f"{i}. {test['test']}")
                print(f"   Endpoint: {test.get('endpoint', 'N/A')}")
                print(f"   Error: {test.get('error', 'N/A')}")
        
        print(f"\n" + "="*60)

def main():
    print("🚀 Starting VipraCo HR Assistant API Tests...")
    print("="*60)
    
    tester = VipraCo_API_Tester()
    
    # Basic connectivity tests
    tester.test_health_check()
    
    # Authentication tests
    tester.test_login_invalid_credentials()
    
    # Login with main test user
    if not tester.test_login_valid_credentials():
        print("❌ Main login failed, stopping critical tests")
        tester.print_summary()
        return 1
    
    # Test other organization logins
    tester.test_login_other_organizations()
    
    # Authorization tests
    tester.test_profile_without_auth()
    tester.test_profile_with_auth()
    
    # Chat functionality tests
    tester.test_chat_without_auth()
    tester.test_chat_hr_queries()
    tester.test_chat_general_ai_query()
    
    # Multi-tenancy tests
    tester.test_data_isolation()
    
    # Print final summary
    tester.print_summary()
    
    # Return appropriate exit code
    return 0 if len(tester.failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())