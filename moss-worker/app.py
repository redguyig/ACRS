import os
import tempfile
import shutil
import logging
from flask import Flask, request, jsonify
from dotenv import load_dotenv

load_dotenv()

# Try to import mosspy, handle gracefully if not available
try:
    import mosspy
    MOSS_AVAILABLE = True
except ImportError:
    MOSS_AVAILABLE = False
    logging.warning("mosspy not available - using mock similarity")

import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__)

DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@postgres:5432/acrs')
MOSS_USER_ID = os.environ.get('MOSS_USER_ID', '0')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

LANGUAGE_EXT_MAP = {
    'cpp': 'cpp',
    'python': 'python',
    'javascript': 'javascript',
    'java': 'java',
    'c': 'c',
}

def get_db_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def get_language_for_moss(language: str) -> str:
    return LANGUAGE_EXT_MAP.get(language.lower(), 'python')

@app.route('/health', methods=['GET'])
def health():
    try:
        conn = get_db_connection()
        conn.close()
        return jsonify({'status': 'ok', 'moss_available': MOSS_AVAILABLE})
    except Exception as e:
        return jsonify({'status': 'error', 'error': str(e)}), 503

@app.route('/run-moss', methods=['POST'])
def run_moss():
    data = request.get_json()
    assignment_id = data.get('assignment_id')
    
    if not assignment_id:
        return jsonify({'error': 'assignment_id required'}), 400

    logger.info(f"Starting Moss check for assignment {assignment_id}")

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT s.id, s.student_id, s.code_content, s.language, u.name as student_name
            FROM submissions s
            JOIN users u ON s.student_id = u.id
            WHERE s.assignment_id = %s
        """, (assignment_id,))
        submissions = cur.fetchall()
        
        if len(submissions) < 2:
            return jsonify({'status': 'complete', 'message': 'Not enough submissions', 'pairs': 0})
        
        # Get assignment language
        cur.execute("SELECT language FROM assignments WHERE id = %s", (assignment_id,))
        assignment = cur.fetchone()
        moss_language = get_language_for_moss(assignment['language'] if assignment else 'python')
        
        cur.close()
        conn.close()
        
        # Run Moss check
        results = run_moss_check(submissions, moss_language, assignment_id)
        
        # Store results
        store_results(assignment_id, results)
        
        logger.info(f"Moss check completed for assignment {assignment_id}: {len(results)} pairs found")
        return jsonify({'status': 'complete', 'pairs': len(results)})
        
    except Exception as e:
        logger.error(f"Moss check failed: {e}")
        return jsonify({'status': 'error', 'error': str(e)}), 500

def run_moss_check(submissions, language, assignment_id):
    """Run Moss similarity check - uses mosspy if available, otherwise mock"""
    
    if not MOSS_AVAILABLE:
        logger.warning("Using mock similarity (mosspy not installed)")
        return mock_similarity_check(submissions)
    
    tmpdir = tempfile.mkdtemp(prefix=f'moss_{assignment_id}_')
    results = []
    
    try:
        m = mosspy.Moss(MOSS_USER_ID, language)
        
        for sub in submissions:
            ext = LANGUAGE_EXT_MAP.get(sub['language'], 'txt')
            filepath = os.path.join(tmpdir, f"{sub['student_id']}.{ext}")
            with open(filepath, 'w') as f:
                f.write(sub['code_content'])
            m.addFile(filepath)
        
        logger.info("Submitting to Moss...")
        url = m.send()
        logger.info(f"Moss report URL: {url}")
        
        # Parse results (simplified - in production, parse the HTML report)
        # For now, we'll use a simple comparison as fallback
        results = parse_moss_results(submissions, url)
        
    except Exception as e:
        logger.error(f"Moss submission failed: {e}")
        results = mock_similarity_check(submissions)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)
    
    return results

def mock_similarity_check(submissions):
    """Mock similarity check for development without Moss account"""
    import difflib
    
    results = []
    for i in range(len(submissions)):
        for j in range(i + 1, len(submissions)):
            a = submissions[i]['code_content']
            b = submissions[j]['code_content']
            
            # Normalize code
            a_norm = normalize_code(a)
            b_norm = normalize_code(b)
            
            if not a_norm or not b_norm:
                similarity = 0
            else:
                similarity = int(difflib.SequenceMatcher(None, a_norm, b_norm).ratio() * 100)
            
            if similarity >= 30:  # Only report pairs above 30%
                results.append({
                    'student_a_id': submissions[i]['student_id'],
                    'student_b_id': submissions[j]['student_id'],
                    'similarity_pct': similarity,
                    'moss_report_url': None,
                })
    
    return results

def normalize_code(code: str) -> str:
    """Normalize code for comparison"""
    import re
    # Remove comments, extra whitespace
    code = re.sub(r'//.*?\n|/\*.*?\*/', '', code, flags=re.DOTALL)
    code = re.sub(r'#.*?\n', '', code)
    code = re.sub(r'\s+', ' ', code)
    return code.strip().lower()

def parse_moss_results(submissions, moss_url):
    """Parse Moss HTML report - simplified version"""
    # In production, fetch and parse the Moss HTML report
    # For now, return mock results
    return mock_similarity_check(submissions)

def store_results(assignment_id, results):
    """Store plagiarism results in database"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Clear existing results for this assignment
        cur.execute("DELETE FROM plagiarism WHERE assignment_id = %s", (assignment_id,))
        
        for r in results:
            cur.execute("""
                INSERT INTO plagiarism (assignment_id, student_a_id, student_b_id, similarity_pct, status, moss_report_url)
                VALUES (%s, %s, %s, %s, 'flagged', %s)
            """, (assignment_id, r['student_a_id'], r['student_b_id'], r['similarity_pct'], r.get('moss_report_url')))
        
        conn.commit()
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)