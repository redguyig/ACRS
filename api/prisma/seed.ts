import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.rubricScore.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.plagiarism.deleteMany();
  await prisma.jobQueue.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create 1 Course
  const course = await prisma.course.create({
    data: {
      name: 'Intro to Computer Science',
      department: 'Computer Science',
      batchYear: 2026,
    }
  });

  // 2. Create Admin
  await prisma.user.create({
    data: { name: 'Admin User', email: 'admin@demo.com', passwordHash: hashedPassword, role: 'admin' }
  });

  // 3. Create 2 Faculty Members
  const faculty1 = await prisma.user.create({
    data: { name: 'Dr. Smith', email: 'faculty1@demo.com', passwordHash: hashedPassword, role: 'faculty' }
  });
  const faculty2 = await prisma.user.create({
    data: { name: 'Prof. Johnson', email: 'faculty2@demo.com', passwordHash: hashedPassword, role: 'faculty' }
  });

  // 4. Create 10 Students and enroll them in the course
  const studentData = [];
  for (let i = 1; i <= 10; i++) {
    studentData.push({
      name: `Student ${i}`,
      email: `student${i}@demo.com`,
      passwordHash: hashedPassword,
      role: 'student',
      courseId: course.id
    });
  }
  await prisma.user.createMany({ data: studentData });

  // Fetch the students back since createMany doesn't return them
  const students = await prisma.user.findMany({
    where: { role: 'student', courseId: course.id },
    orderBy: { email: 'asc' }
  });

  const activeStudents = students.slice(0, 8);

  // Setup Dates & Rubric
  const now = new Date();
  const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const futureDate1 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const futureDate2 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const rubric = [
    { criterion: 'Correctness', maxScore: 40 },
    { criterion: 'Code Quality', maxScore: 20 },
    { criterion: 'Documentation', maxScore: 20 },
    { criterion: 'Performance', maxScore: 20 }
  ];
  const rubricStr = JSON.stringify(rubric);

  // 5. Create 5 Assignments
  const a1Late = await prisma.assignment.create({
    data: {
      title: 'Python Fundamentals', description: 'Implement basic algorithms in Python. This assignment is past due.',
      language: 'python', deadline: pastDate, anonymous: false,
      courseId: course.id, createdBy: faculty1.id, rubricJson: rubricStr
    }
  });
  const a2Due = await prisma.assignment.create({
    data: {
      title: 'JavaScript Patterns', description: 'Implement common JS design patterns. Due in 7 days.',
      language: 'javascript', deadline: futureDate1, anonymous: false,
      courseId: course.id, createdBy: faculty1.id, rubricJson: rubricStr
    }
  });
  const a3Due = await prisma.assignment.create({
    data: {
      title: 'Java Data Structures', description: 'Implement data structures in Java. Due in 14 days.',
      language: 'java', deadline: futureDate2, anonymous: true,
      courseId: course.id, createdBy: faculty1.id, rubricJson: rubricStr
    }
  });
  const a4Submitted = await prisma.assignment.create({
    data: {
      title: 'Python Sorting & Searching', description: 'Implement sorting and searching algorithms in Python.',
      language: 'python', deadline: pastDate, anonymous: false,
      courseId: course.id, createdBy: faculty1.id, rubricJson: rubricStr
    }
  });
  const a5Plagiarism = await prisma.assignment.create({
    data: {
      title: 'C++ Dynamic Programming', description: 'Solve DP problems in C++. This assignment is flagged for plagiarism.',
      language: 'cpp', deadline: pastDate, anonymous: false,
      courseId: course.id, createdBy: faculty1.id, rubricJson: rubricStr
    }
  });

  // ========== CODE TEMPLATES ==========

  const pythonCodes = [
`def fibonacci_sequence(num):
    if num <= 0: return []
    elif num == 1: return [0]
    res = [0, 1]
    for idx in range(2, num):
        res.append(res[idx-1] + res[idx-2])
    return res
output = fibonacci_sequence(10)
print("Fibonacci:", output)`,

`def generate_fibonacci(n):
    if n <= 0: return []
    elif n == 1: return [0]
    seq = [0, 1]
    for i in range(2, n):
        seq.append(seq[i-1] + seq[i-2])
    return seq
final_result = generate_fibonacci(10)
print("Fibonacci:", final_result)`,

`def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr
print("Sorted:", bubble_sort([64, 34, 25, 12, 22, 11, 90]))`,

`def binary_search(arr, target):
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target: return mid
        elif arr[mid] < target: low = mid + 1
        else: high = mid - 1
    return -1
print("Index:", binary_search([2,5,8,12,16,23,38,56], 23))`,

`def multiply_matrices(a, b):
    rows_a, cols_a = len(a), len(a[0])
    result = [[0]*len(b[0]) for _ in range(rows_a)]
    for i in range(rows_a):
        for j in range(len(b[0])):
            for k in range(cols_a):
                result[i][j] += a[i][k] * b[k][j]
    return result
print(multiply_matrices([[1,2],[3,4]], [[5,6],[7,8]]))`,

`def is_palindrome(text):
    cleaned = ''.join(c.lower() for c in text if c.isalnum())
    return cleaned == cleaned[::-1]
for s in ["racecar", "hello", "A man a plan a canal Panama"]:
    print(f"'{s}' -> {is_palindrome(s)}")`,

`def calculate(a, op, b):
    ops = {'+': lambda x,y: x+y, '-': lambda x,y: x-y,
           '*': lambda x,y: x*y, '/': lambda x,y: x/y if y!=0 else None}
    return ops.get(op, lambda x,y: None)(a, b)
print(calculate(10, '+', 5))
print(calculate(10, '*', 3))`,

`def sieve(limit):
    is_prime = [True] * (limit + 1)
    is_prime[0] = is_prime[1] = False
    for i in range(2, int(limit**0.5) + 1):
        if is_prime[i]:
            for j in range(i*i, limit+1, i): is_prime[j] = False
    return [i for i in range(limit+1) if is_prime[i]]
print("Primes:", sieve(100))`,
  ];

  const jsCodes = [
`class Node { constructor(d) { this.data=d; this.next=null; } }
class LinkedList {
  constructor() { this.head=null; }
  append(d) { const n=new Node(d); if(!this.head){this.head=n;return;} let c=this.head; while(c.next) c=c.next; c.next=n; }
  print() { let c=this.head,r=[]; while(c){r.push(c.data);c=c.next;} console.log(r.join("->")); }
}
const l=new LinkedList(); [10,20,30].forEach(v=>l.append(v)); l.print();`,

`function debounce(fn, delay) {
  let timer;
  return function(...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), delay); };
}
const log = debounce(v => console.log("Input:", v), 300);
log("test");`,

`class AsyncQueue {
  constructor(c) { this.max=c; this.running=0; this.queue=[]; }
  async enqueue(task) { return new Promise((res,rej) => { this.queue.push({task,res,rej}); this.run(); }); }
  async run() { if(this.running>=this.max||!this.queue.length) return; this.running++;
    const{task,res,rej}=this.queue.shift(); try{res(await task());}catch(e){rej(e);}finally{this.running--;this.run();} }
}
console.log("Queue ready");`,

`function deepClone(obj) {
  if(obj===null||typeof obj!=='object') return obj;
  if(obj instanceof Date) return new Date(obj);
  if(Array.isArray(obj)) return obj.map(i=>deepClone(i));
  const c={}; for(const k in obj) if(obj.hasOwnProperty(k)) c[k]=deepClone(obj[k]); return c;
}
console.log(JSON.stringify(deepClone({a:1,b:{c:[1,2]}})));`,

`class EventEmitter {
  constructor(){this.events={};}
  on(e,fn){if(!this.events[e])this.events[e]=[];this.events[e].push(fn);return this;}
  emit(e,...a){if(!this.events[e])return;this.events[e].forEach(fn=>fn(...a));}
  off(e,fn){if(!this.events[e])return;this.events[e]=this.events[e].filter(f=>f!==fn);}
}
const em=new EventEmitter(); em.on('data',m=>console.log(m)); em.emit('data','Hello');`,

`function throttle(fn,limit) {
  let t=false; return function(...a){if(!t){fn.apply(this,a);t=true;setTimeout(()=>t=false,limit);}};
}
const s=throttle(()=>console.log("scroll"),1000); s();s();s();`,

`function flattenDeep(arr) {
  return arr.reduce((a,v) => Array.isArray(v)?a.concat(flattenDeep(v)):a.concat(v),[]);
}
console.log(flattenDeep([1,[2,[3,[4]],5]]));`,

`class LRUCache {
  constructor(cap){this.cap=cap;this.cache=new Map();}
  get(k){if(!this.cache.has(k))return -1; const v=this.cache.get(k);this.cache.delete(k);this.cache.set(k,v);return v;}
  put(k,v){if(this.cache.has(k))this.cache.delete(k);else if(this.cache.size>=this.cap)this.cache.delete(this.cache.keys().next().value);this.cache.set(k,v);}
}
const c=new LRUCache(3); c.put(1,"a"); c.put(2,"b"); console.log(c.get(1));`,
  ];

  const javaCodes = [
`import java.util.Stack;
public class Solution {
    public static boolean isBalanced(String expr) {
        Stack<Character> s = new Stack<>();
        for (char c : expr.toCharArray()) {
            if (c=='('||c=='{'||c=='[') s.push(c);
            else if (c==')' && (s.isEmpty()||s.pop()!='(')) return false;
            else if (c=='}' && (s.isEmpty()||s.pop()!='{')) return false;
            else if (c==']' && (s.isEmpty()||s.pop()!='[')) return false;
        }
        return s.isEmpty();
    }
    public static void main(String[] args) { System.out.println(isBalanced("{[()]}")); }
}`,

`import java.util.Stack;
public class Solution {
    public static boolean isBalanced(String str) {
        Stack<Character> stack = new Stack<>();
        for (char ch : str.toCharArray()) {
            if (ch=='('||ch=='{'||ch=='[') stack.push(ch);
            else if (ch==')' && (stack.isEmpty()||stack.pop()!='(')) return false;
            else if (ch=='}' && (stack.isEmpty()||stack.pop()!='{')) return false;
            else if (ch==']' && (stack.isEmpty()||stack.pop()!='[')) return false;
        }
        return stack.isEmpty();
    }
    public static void main(String[] args) { System.out.println(isBalanced("{[()]}")); }
}`,

`import java.util.Stack;
public class Solution {
    public static boolean checkBalance(String input) {
        Stack<Character> st = new Stack<>();
        for (char curr : input.toCharArray()) {
            if (curr=='('||curr=='{'||curr=='[') st.push(curr);
            else if (curr==')' && (st.isEmpty()||st.pop()!='(')) return false;
            else if (curr=='}' && (st.isEmpty()||st.pop()!='{')) return false;
            else if (curr==']' && (st.isEmpty()||st.pop()!='[')) return false;
        }
        return st.isEmpty();
    }
    public static void main(String[] args) { System.out.println(checkBalance("{[()]}")); }
}`,

`public class Solution {
    public static void hanoi(int n, char from, char to, char aux) {
        if(n==1){System.out.println("Move 1: "+from+"->"+to);return;}
        hanoi(n-1,from,aux,to); System.out.println("Move "+n+": "+from+"->"+to); hanoi(n-1,aux,to,from);
    }
    public static void main(String[] args) { hanoi(4,'A','C','B'); }
}`,

`import java.util.HashMap;
public class Solution {
    public static HashMap<String,Integer> count(String t) {
        HashMap<String,Integer> f=new HashMap<>();
        for(String w:t.toLowerCase().split("\\\\W+")) f.put(w,f.getOrDefault(w,0)+1);
        return f;
    }
    public static void main(String[] args) { System.out.println(count("the quick brown fox jumps over the lazy dog the fox")); }
}`,

`public class Solution {
    public static String reverse(String s) {
        char[] c=s.toCharArray(); int l=0,r=c.length-1;
        while(l<r){char t=c[l];c[l]=c[r];c[r]=t;l++;r--;}
        return new String(c);
    }
    public static void main(String[] args) { System.out.println(reverse("Hello World")); }
}`,

`public class Solution {
    public static int[][] transpose(int[][] m) {
        int[][] r=new int[m[0].length][m.length];
        for(int i=0;i<m.length;i++) for(int j=0;j<m[0].length;j++) r[j][i]=m[i][j];
        return r;
    }
    public static void main(String[] args) {
        int[][] t=transpose(new int[][]{{1,2,3},{4,5,6}});
        for(int[] row:t) System.out.println(java.util.Arrays.toString(row));
    }
}`,

`public class Solution {
    public static long power(int b, int e) {
        if(e==0) return 1; if(e%2==0){long h=power(b,e/2);return h*h;} return b*power(b,e-1);
    }
    public static void main(String[] args) { System.out.println("2^10="+power(2,10)); System.out.println("3^5="+power(3,5)); }
}`,
  ];

  // C++ code for A5 — Student 1 & 2 submit near-identical code (plagiarized)
  const cppCopied = `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int longestIncreasingSubsequence(vector<int>& nums) {
    int n = nums.size();
    if (n == 0) return 0;
    vector<int> dp(n, 1);
    int maxLength = 1;
    for (int i = 1; i < n; i++) {
        for (int j = 0; j < i; j++) {
            if (nums[j] < nums[i]) {
                dp[i] = max(dp[i], dp[j] + 1);
            }
        }
        maxLength = max(maxLength, dp[i]);
    }
    return maxLength;
}

void printLIS(vector<int>& nums) {
    int n = nums.size();
    vector<int> dp(n, 1);
    vector<int> parent(n, -1);
    int maxLen = 1, maxIdx = 0;
    for (int i = 1; i < n; i++) {
        for (int j = 0; j < i; j++) {
            if (nums[j] < nums[i] && dp[j] + 1 > dp[i]) {
                dp[i] = dp[j] + 1;
                parent[i] = j;
            }
        }
        if (dp[i] > maxLen) { maxLen = dp[i]; maxIdx = i; }
    }
    vector<int> lis;
    for (int i = maxIdx; i != -1; i = parent[i]) lis.push_back(nums[i]);
    reverse(lis.begin(), lis.end());
    cout << "LIS: ";
    for (int x : lis) cout << x << " ";
    cout << endl;
}

int main() {
    vector<int> nums = {10, 9, 2, 5, 3, 7, 101, 18};
    cout << "Length of LIS: " << longestIncreasingSubsequence(nums) << endl;
    printLIS(nums);
    return 0;
}`;

  // Student 2 copied — only trivial variable renames (will score ~90%+ similarity)
  const cppCopiedVariant = `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int longestIncreasingSubsequence(vector<int>& arr) {
    int n = arr.size();
    if (n == 0) return 0;
    vector<int> dp(n, 1);
    int maxLength = 1;
    for (int i = 1; i < n; i++) {
        for (int j = 0; j < i; j++) {
            if (arr[j] < arr[i]) {
                dp[i] = max(dp[i], dp[j] + 1);
            }
        }
        maxLength = max(maxLength, dp[i]);
    }
    return maxLength;
}

void printLIS(vector<int>& arr) {
    int n = arr.size();
    vector<int> dp(n, 1);
    vector<int> parent(n, -1);
    int maxLen = 1, maxIdx = 0;
    for (int i = 1; i < n; i++) {
        for (int j = 0; j < i; j++) {
            if (arr[j] < arr[i] && dp[j] + 1 > dp[i]) {
                dp[i] = dp[j] + 1;
                parent[i] = j;
            }
        }
        if (dp[i] > maxLen) { maxLen = dp[i]; maxIdx = i; }
    }
    vector<int> lis;
    for (int i = maxIdx; i != -1; i = parent[i]) lis.push_back(arr[i]);
    reverse(lis.begin(), lis.end());
    cout << "LIS: ";
    for (int x : lis) cout << x << " ";
    cout << endl;
}

int main() {
    vector<int> arr = {10, 9, 2, 5, 3, 7, 101, 18};
    cout << "Length of LIS: " << longestIncreasingSubsequence(arr) << endl;
    printLIS(arr);
    return 0;
}`;

  // Unique C++ code for other students (completely different algorithms)
  const cppUnique = [
`#include <iostream>
#include <queue>
using namespace std;
struct TreeNode { int val; TreeNode* left; TreeNode* right; TreeNode(int x):val(x),left(nullptr),right(nullptr){} };
void levelOrder(TreeNode* root) {
    if(!root) return; queue<TreeNode*> q; q.push(root);
    while(!q.empty()){ int sz=q.size(); for(int i=0;i<sz;i++){ TreeNode* n=q.front();q.pop(); cout<<n->val<<" ";
    if(n->left)q.push(n->left); if(n->right)q.push(n->right); } cout<<endl; }
}
int main(){ TreeNode* r=new TreeNode(1); r->left=new TreeNode(2); r->right=new TreeNode(3);
r->left->left=new TreeNode(4); levelOrder(r); return 0; }`,

`#include <iostream>
#include <string>
#include <stack>
using namespace std;
int evalPostfix(const string& expr) {
    stack<int> s;
    for(char c:expr){ if(isdigit(c)) s.push(c-'0');
    else{ int b=s.top();s.pop();int a=s.top();s.pop();
    switch(c){case '+':s.push(a+b);break;case '-':s.push(a-b);break;case '*':s.push(a*b);break;case '/':s.push(a/b);break;} } }
    return s.top();
}
int main(){ cout<<"23*5+="<<evalPostfix("23*5+")<<endl; return 0; }`,

`#include <iostream>
#include <vector>
using namespace std;
class MinHeap {
    vector<int> h;
    void up(int i){while(i>0&&h[(i-1)/2]>h[i]){swap(h[(i-1)/2],h[i]);i=(i-1)/2;}}
    void down(int i){int s=i,l=2*i+1,r=2*i+2;
    if(l<(int)h.size()&&h[l]<h[s])s=l;if(r<(int)h.size()&&h[r]<h[s])s=r;if(s!=i){swap(h[i],h[s]);down(s);}}
public:
    void insert(int v){h.push_back(v);up(h.size()-1);}
    int extractMin(){int m=h[0];h[0]=h.back();h.pop_back();down(0);return m;}
};
int main(){MinHeap hp;hp.insert(5);hp.insert(3);hp.insert(1);cout<<hp.extractMin()<<endl;return 0;}`,

`#include <iostream>
#include <vector>
using namespace std;
int climbStairs(int n){if(n<=2)return n;int a=1,b=2;for(int i=3;i<=n;i++){int c=a+b;a=b;b=c;}return b;}
int coinChange(vector<int>& coins,int amount){
    vector<int> dp(amount+1,amount+1);dp[0]=0;
    for(int i=1;i<=amount;i++) for(int c:coins) if(c<=i) dp[i]=min(dp[i],dp[i-c]+1);
    return dp[amount]>amount?-1:dp[amount];
}
int main(){cout<<"Stairs(5)="<<climbStairs(5)<<endl;vector<int>c={1,5,10,25};cout<<"Coins(30)="<<coinChange(c,30)<<endl;return 0;}`,

`#include <iostream>
#include <list>
#include <vector>
using namespace std;
class HashTable {
    int sz; vector<list<pair<int,string>>> t;
public:
    HashTable(int s):sz(s),t(s){}
    void insert(int k,const string& v){int i=k%sz;for(auto& p:t[i])if(p.first==k){p.second=v;return;}t[i].push_back({k,v});}
    string search(int k){int i=k%sz;for(auto& p:t[i])if(p.first==k)return p.second;return "Not found";}
};
int main(){HashTable ht(10);ht.insert(1,"Alice");ht.insert(11,"Bob");cout<<ht.search(1)<<" "<<ht.search(11)<<endl;return 0;}`,

`#include <iostream>
#include <vector>
using namespace std;
void dfs(vector<vector<int>>& g,int i,int j){
    if(i<0||j<0||i>=(int)g.size()||j>=(int)g[0].size()||g[i][j]==0) return;
    g[i][j]=0; dfs(g,i+1,j);dfs(g,i-1,j);dfs(g,i,j+1);dfs(g,i,j-1);
}
int countIslands(vector<vector<int>>& g){
    int c=0; for(int i=0;i<(int)g.size();i++) for(int j=0;j<(int)g[0].size();j++) if(g[i][j]==1){c++;dfs(g,i,j);} return c;
}
int main(){vector<vector<int>> g={{1,1,0,0},{0,1,0,0},{0,0,1,0},{0,0,0,1}};cout<<"Islands:"<<countIslands(g)<<endl;return 0;}`,
  ];

  // 6. Generate Submissions
  const assignments = [a1Late, a2Due, a3Due, a4Submitted, a5Plagiarism];
  const submissionData: Array<{studentId: string; assignmentId: string; codeContent: string; language: string; status: string}> = [];

  for (let si = 0; si < activeStudents.length; si++) {
    const student = activeStudents[si];
    for (const assignment of assignments) {
      // ALL active students submit all assignments to guarantee exactly 8 submissions per assignment
      const shouldSubmit = true;
      if (shouldSubmit) {
        let code = '';

        if (assignment.id === a5Plagiarism.id) {
          if (si === 0) code = cppCopied;
          else if (si === 1) code = cppCopiedVariant;
          else code = cppUnique[si - 2];
        } else if (assignment.language === 'python') {
          code = pythonCodes[si];
        } else if (assignment.language === 'javascript') {
          code = jsCodes[si];
        } else if (assignment.language === 'java') {
          code = javaCodes[si];
        }

        // Student 1's A1 submission will be marked as 'reviewed' (given back with feedback)
        const status = (si === 0 && assignment.id === a1Late.id) ? 'reviewed' : 'submitted';

        submissionData.push({
          studentId: student.id,
          assignmentId: assignment.id,
          codeContent: code,
          language: assignment.language,
          status,
        });
      }
    }
  }

  console.log("Submission Data Length: ", submissionData.length);
  await prisma.submission.createMany({ data: submissionData });

  // 7a. Add feedback for Student 1's reviewed A1 submission
  const student1A1 = await prisma.submission.findFirst({
    where: { studentId: activeStudents[0].id, assignmentId: a1Late.id },
  });
  if (student1A1) {
    await prisma.feedback.create({
      data: {
        submissionId: student1A1.id,
        generalComment: 'Good implementation of Fibonacci! Consider adding memoization for better performance.',
        totalGrade: 78,
      }
    });
    await prisma.rubricScore.createMany({
      data: [
        { submissionId: student1A1.id, criterion: 'Correctness', maxScore: 40, awardedScore: 35 },
        { submissionId: student1A1.id, criterion: 'Code Quality', maxScore: 20, awardedScore: 16 },
        { submissionId: student1A1.id, criterion: 'Documentation', maxScore: 20, awardedScore: 12 },
        { submissionId: student1A1.id, criterion: 'Performance', maxScore: 20, awardedScore: 15 },
      ]
    });
  }

  // 7b. Pre-seed plagiarism flag for Student 1 & 2 on Assignment 5
  await prisma.plagiarism.create({
    data: {
      assignmentId: a5Plagiarism.id,
      studentAId: activeStudents[0].id,
      studentBId: activeStudents[1].id,
      similarityPct: 92,
      status: 'flagged'
    }
  });

  console.log('Database seeded with 10 students, 2 faculty, and complex assignments!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });