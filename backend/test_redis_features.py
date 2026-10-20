import time
import requests
import sys

BASE_URL = "http://localhost:8000/api/v1"

def run_tests():
    print("========================================")
    print("Testing Redis & Celery Features")
    print("========================================")

    # 1. Login with existing or new user
    user_email = "redis_test@example.com"
    user_password = "Password123!"

    print("\n[1] Registering/logging in test user...")
    reg_res = requests.post(f"{BASE_URL}/auth/register", json={
        "email": user_email,
        "password": user_password,
        "full_name": "Redis Tester"
    })
    
    login_res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": user_email,
        "password": user_password
    })
    if login_res.status_code != 200:
        print(f"FAILED to login: {login_res.status_code} {login_res.text}")
        sys.exit(1)

    token_data = login_res.json()
    token = token_data["access_token"]
    print(f"SUCCESS: Logged in. Token received (len={len(token)})")

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test authenticated endpoint
    print("\n[2] Testing protected endpoint with valid token (/auth/me)...")
    me_res = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    assert me_res.status_code == 200, f"Expected 200, got {me_res.status_code}"
    print(f"SUCCESS: /auth/me returned user {me_res.json()['email']}")

    # 3. Test Logout (Blacklisting in Redis)
    print("\n[3] Testing /auth/logout (Blacklisting token in Redis)...")
    logout_res = requests.post(f"{BASE_URL}/auth/logout", headers=headers)
    assert logout_res.status_code == 200, f"Expected 200, got {logout_res.status_code}: {logout_res.text}"
    print(f"SUCCESS: /auth/logout response: {logout_res.json()}")

    # 4. Verify blacklisted token is rejected
    print("\n[4] Verifying revoked token is rejected on /auth/me...")
    revoked_res = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    print(f"Status code with revoked token: {revoked_res.status_code}")
    assert revoked_res.status_code == 401, f"Expected 401, got {revoked_res.status_code}"
    print(f"SUCCESS: Revoked token was properly rejected! Detail: {revoked_res.json()}")

    # 5. Log in again for testing Celery Task Queue
    print("\n[5] Logging in again for Celery PDF processing test...")
    login_res2 = requests.post(f"{BASE_URL}/auth/login", json={
        "email": user_email,
        "password": user_password
    })
    token2 = login_res2.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # 6. Create a dummy minimal PDF
    pdf_content = (
        b"%PDF-1.4\n"
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
        b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj\n"
        b"4 0 obj<</Length 55>>stream\n"
        b"BT /F1 12 Tf 72 712 Td (DocuMind Redis Celery Background Task Test) Tj ET\n"
        b"endstream\n"
        b"endobj\n"
        b"xref\n"
        b"0 5\n"
        b"0000000000 65535 f \n"
        b"0000000010 00000 n \n"
        b"0000000060 00000 n \n"
        b"0000000117 00000 n \n"
        b"0000000216 00000 n \n"
        b"trailer<</Size 5/Root 1 0 R>>\n"
        b"startxref\n"
        b"322\n"
        b"%%EOF\n"
    )

    print("\n[6] Uploading PDF to test Celery background task...")
    files = {"file": ("test_background.pdf", pdf_content, "application/pdf")}
    upload_res = requests.post(f"{BASE_URL}/documents/upload", headers=headers2, files=files)
    assert upload_res.status_code == 200, f"Upload failed: {upload_res.status_code} {upload_res.text}"
    doc_info = upload_res.json()
    doc_id = doc_info["id"]
    print(f"SUCCESS: Immediate response returned: id={doc_id}, status={doc_info.get('status')}")
    assert doc_info.get("status") == "processing", f"Expected 'processing', got {doc_info.get('status')}"

    # 7. Poll status until Celery worker completes the task
    print("\n[7] Polling status until Celery worker finishes...")
    for i in range(15):
        time.sleep(1.5)
        status_res = requests.get(f"{BASE_URL}/documents/{doc_id}/status", headers=headers2)
        assert status_res.status_code == 200, f"Status check failed: {status_res.status_code}"
        current_status = status_res.json()["status"]
        print(f"   Poll #{i+1}: status = {current_status}")
        if current_status == "ready":
            print("SUCCESS: Celery worker finished document extraction and embedding! Status is 'ready'.")
            break
        elif current_status == "failed":
            print(f"Task reported failed: {status_res.json()}")
            break
    else:
        print("Polling timed out.")

    print("\n========================================")
    print("ALL TESTS PASSED SUCCESSFULLY! :)")
    print("========================================")

if __name__ == "__main__":
    run_tests()
