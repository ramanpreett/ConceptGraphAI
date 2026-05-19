/**
 * AI Service — Powered by Google Gemini
 * Keeps the legacy function names used by the backend so the rest of the app
 * can keep calling the same module while the provider changes.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.GOOGLE_GENAI_API_KEY ||
  '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-pro';

let geminiClient = null;

const getGeminiClient = () => {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
  }

  return geminiClient;
};

const getModel = (options = {}) => {
  const client = getGeminiClient();
  return client.getGenerativeModel({
    model: options.model || GEMINI_MODEL,
    generationConfig: {
      temperature: options.temperature ?? 0.6,
      topP: options.topP ?? 0.9,
      maxOutputTokens: options.numPredict ?? 1200,
      responseMimeType: options.json ? 'application/json' : 'text/plain',
    },
  });
};

/* ─── low-level generate call ───────────────────────────────────────────── */
const generateText = async (prompt, options = {}) => {
  const model = getModel(options);
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = typeof response?.text === 'function' ? response.text() : '';
  return String(text || '').trim();
};

/* ─── connection test ────────────────────────────────────────────────────── */
const testOllamaConnection = async () => {
  try {
    console.log('🔍 Gemini: testing connection...');
    console.log('   API Key present:', !!GEMINI_API_KEY);
    console.log('   Model:', GEMINI_MODEL);

    const response = await generateText('Reply with exactly the single word OK.', {
      temperature: 0,
      numPredict: 10,
    });

    console.log('   Response received:', response.substring(0, 50));
    const connected = /^ok$/i.test(response.trim());
    console.log('✅ Gemini connection test:', connected ? 'connected' : `unexpected response: "${response.trim()}"`);
    return connected;
  } catch (error) {
    console.error('❌ Gemini connection test failed:');
    console.error('   Error:', error && error.message ? error.message : String(error));
    if (error && error.stack) {
      console.error('   Stack:', error.stack.split('\n').slice(0, 3).join('\n   '));
    }
    return false;
  }
};

const testGeminiConnection = testOllamaConnection;

/* ─── JSON extractor ─────────────────────────────────────────────────────── */
const extractJSON = (text) => {
  try { return JSON.parse(text); } catch (_) { /* fall through */ }
  const stripped = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(stripped); } catch (_) { /* fall through */ }
  const match = stripped.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch (_) { /* fall through */ } }
  return null;
};

const normalizeTopicList = (topicObjects) => (Array.isArray(topicObjects) ? topicObjects : [])
  .map((topic) => (typeof topic === 'string' ? { name: topic } : topic))
  .filter((topic) => topic && topic.name);

const buildDocContext = (firstArg, secondArg) => {
  const parts = [];
  if (typeof firstArg === 'string' && firstArg.trim()) parts.push(firstArg.trim());
  if (typeof secondArg === 'string' && secondArg.trim()) parts.push(secondArg.trim());
  return parts.join('\n\n');
};

/* ═══════════════════════════════════════════════════════════════════════════
   1. TOPIC EXTRACTION
══════════════════════════════════════════════════════════════════════════════ */
const extractTopicsAdvanced = async (text) => {
  const doc = text.replace(/\s+/g, ' ').trim().slice(0, 14000);

  const prompt = `You are an expert academic curriculum analyst.

Read the following document and extract a comprehensive hierarchical knowledge structure.

DOCUMENT:
---
${doc}
---
Extract EVERY module/unit/chapter as a topic, and EVERY concept listed inside each module as a subtopic. Do not skip or summarise — include everything explicitly present in the document.

RULES:
- One topic per module/unit (do not merge modules).
- Subtopics = every individual concept, technique, or term explicitly listed inside that module in the document.
- If a module has NO explicitly listed subtopics in the document, set "subtopics" to an empty array for that topic. Do NOT invent, infer, or hallucinate subtopics.
- Do not invent content. Use only what the document says.
- Do not limit the number of topics or subtopics when they are present.

Respond ONLY with valid JSON, no explanation, no markdown:
{
  "subject": "Overall subject name",
  "summary": "2-3 sentence summary",
  "topics": [
    {
      "name": "Module/Topic Name",
      "description": "One sentence describing this module",
      "subtopics": []
    }
  ],
  "relationships": [
    { "from": "Topic A", "to": "Topic B", "type": "prerequisite" }
  ],
  "keyTerms": ["term1", "term2"]}`;

  try {
    const raw    = await generateText(prompt, { temperature: 0.1, numPredict: 4000 });
    const parsed = extractJSON(raw);
    if (!parsed || !Array.isArray(parsed.topics) || parsed.topics.length === 0)
      throw new Error('Invalid topic structure from Gemini');
    console.log(`✅ Gemini extracted ${parsed.topics.length} topics`);
    return parsed;
  } catch (err) {
    console.error('extractTopicsAdvanced error:', err.message);
    return { topics: [], relationships: [], summary: '', keyTerms: [] };
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   2. QUESTION GENERATION
══════════════════════════════════════════════════════════════════════════════ */
const generateDocumentQuestions = async (topicObjects, docSnippetOrContext, questionsPerTopicOrDocText = 3, seed = 0) => {
  const topicList = normalizeTopicList(topicObjects);

  const controllerStyleCall = typeof questionsPerTopicOrDocText === 'number' || typeof questionsPerTopicOrDocText === 'undefined';
  const docCtx = controllerStyleCall
    ? (typeof docSnippetOrContext === 'string' ? docSnippetOrContext.slice(0, 2000) : '')
    : buildDocContext(docSnippetOrContext, questionsPerTopicOrDocText).slice(0, 2000);

  const topics = topicList; // no cap — process all extracted topics
  const qPerTopic = controllerStyleCall
    ? Math.max(1, Number(questionsPerTopicOrDocText) || 3)
    : 3;

  const questionSeed = controllerStyleCall ? seed : 0;

  const ANGLES = [
    'definition and explanation',
    'real-world application',
    'analysis and comparison',
    'problem-solving and design',
    'evaluation and critique',
  ];
  const questionAngle = ANGLES[Math.floor(questionSeed / 1000) % ANGLES.length];

  console.log(`✨ Gemini: generating ${qPerTopic} questions per topic for ${topics.length} topics...`);

  const perTopicPromises = topics.map(async (topicObj) => {
    const topicName   = topicObj.name;
    const parentTopic = topicObj.parentTopic || null;
    const subject     = topicObj.subject     || null;

    const contextLine = [
      subject     && `Subject: "${subject}"`,
      parentTopic && `Parent topic: "${parentTopic}"`,
      `Topic: "${topicName}"`,
    ].filter(Boolean).join(' | ');

    const prompt = `You are a university professor writing exam questions.
${docCtx ? `Course material:\n"""\n${docCtx}\n"""\n` : ''}
${contextLine}

Question style: ${questionAngle}.

Write exactly ${qPerTopic} exam question${qPerTopic > 1 ? 's' : ''} about "${topicName}"${parentTopic ? ` as part of "${parentTopic}"` : ''}.

RULES:
- Every question MUST be directly about "${topicName}".
- Every question MUST end with a question mark.
- No markdown. Output ONLY a numbered list.
${qPerTopic > 1 ? '- Vary depth: beginner, intermediate, advanced.' : ''}

${Array.from({ length: qPerTopic }, (_, i) => `${i + 1}.`).join('\n')}`;

    try {
      const raw = await generateText(prompt, { temperature: 0.65, numPredict: 150 * qPerTopic });
      const qs  = parseQuestions(raw, topicName, qPerTopic, parentTopic);
      console.log(`  ${qs.length > 0 ? '✅' : '⚠️ '} ${topicName}: ${qs.length} questions`);
      return qs;
    } catch (err) {
      console.warn(`  ⚠️  ${topicName} failed:`, err.message);
      return [];
    }
  });

  try {
    const results      = await Promise.all(perTopicPromises);
    const allQuestions = results.flat();
    console.log(`✅ Total: ${allQuestions.length} questions`);
    return allQuestions;
  } catch (err) {
    console.error('generateDocumentQuestions error:', err.message);
    return [];
  }
};

const parseQuestions = (raw, topicName, limit = 3, parentTopic = null) => {
  const TYPE_MAP  = ['comparison', 'application', 'analysis', 'evaluation', 'synthesis'];
  const questions = [];
  const seen      = new Set();

  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*(\d{1,2})[.)\s]\s*(.+)/);
    if (!m) continue;
    const idx = parseInt(m[1], 10) - 1;
    const q   = m[2].trim().replace(/\*\*/g, '').replace(/^[\*_]+|[\*_]+$/g, '').trim();
    if (q.length < 25 || !q.includes('?')) continue;
    const key = q.slice(0, 60).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    questions.push({
      id:          `ollama-${topicName}-${questions.length}`,
      question:    q,
      type:        TYPE_MAP[idx % TYPE_MAP.length] ?? 'analysis',
      topic:       topicName,
      parentTopic: parentTopic || undefined,
      difficulty:  idx < 1 ? 'beginner' : idx < 2 ? 'intermediate' : 'advanced',
      source:      'gemini',
    });

    if (questions.length >= limit) break;
  }
  return questions;
};

/* ═══════════════════════════════════════════════════════════════════════════
   3. ANSWER EVALUATION
══════════════════════════════════════════════════════════════════════════════ */
const evaluateAnswer = async (question, studentAnswer, keyConceptsHint = []) => {
  const conceptsNote = keyConceptsHint.length
    ? `Key concepts expected: ${keyConceptsHint.join(', ')}`
    : '';

  const prompt = `You are a professor evaluating a student's exam answer.

QUESTION:
${question}

STUDENT'S ANSWER:
${studentAnswer}

${conceptsNote}

Evaluate on 4 dimensions (each 0-100):
1. Conceptual accuracy
2. Depth of explanation
3. Use of examples
4. Clarity and structure

Overall score = weighted average (accuracy 35%, depth 30%, examples 20%, clarity 15%).

Respond ONLY with valid JSON (no markdown):
{
  "scores": { "accuracy": 0-100, "depth": 0-100, "examples": 0-100, "clarity": 0-100 },
  "score": 0-100,
  "rating": "strong" or "partial" or "weak",
  "feedback": "2-3 sentence targeted feedback",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "missingConcepts": ["concept A", "concept B"]
}`;

  try {
    const raw    = await generateText(prompt, { temperature: 0.3, numPredict: 800 });
    const parsed = extractJSON(raw);
    if (!parsed || typeof parsed.score !== 'number')
      throw new Error('Invalid evaluation JSON from Gemini');

    const score  = Math.max(0, Math.min(100, Math.round(parsed.score)));
    const rating = score >= 75 ? 'strong' : score >= 45 ? 'partial' : 'weak';

    return {
      score, rating,
      scores: {
        accuracy:      parsed.scores?.accuracy  ?? score,
        depth:         parsed.scores?.depth     ?? score,
        examples:      parsed.scores?.examples  ?? score,
        clarity:       parsed.scores?.clarity   ?? score,
        keyword:       parsed.scores?.accuracy  ?? score,
        length:        parsed.scores?.depth     ?? score,
        understanding: parsed.scores?.examples  ?? score,
      },
      feedback:        parsed.feedback        || 'Evaluated by Gemini',
      strengths:       parsed.strengths       || [],
      improvements:    parsed.improvements    || [],
      missingConcepts: parsed.missingConcepts || [],
      source: 'gemini',
    };
  } catch (err) {
    console.error('evaluateAnswer error:', err.message);
    return null;
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   4. WEAKNESS / ROOT-CAUSE ANALYSIS
══════════════════════════════════════════════════════════════════════════════ */
const analyzeWeakness = async (weakTopic, allTopics, evaluationData) => {
  const topicList = allTopics
    .map(t => (typeof t === 'string' ? t : t.name))
    .filter(Boolean).join(', ');

  const scores = Object.entries(evaluationData)
    .map(([t, e]) => `  ${t}: ${e?.rating ?? 'unknown'} (score: ${e?.score ?? '?'})`)
    .join('\n') || '  No evaluation data';

  const prompt = `You are an expert learning diagnostician.

A student is struggling with: "${weakTopic}"
All topics: ${topicList}
Performance:
${scores}

Identify 3-5 prerequisite concepts the student must master before "${weakTopic}", the root cause, and a step-by-step study plan.

Respond ONLY with valid JSON:
{
  "weakTopic": "${weakTopic}",
  "rootCause": "The single most fundamental gap",
  "prerequisites": [
    { "concept": "Name", "why": "Why it must be mastered first", "priority": "high" }
  ],
  "studyPlan": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
  "estimatedRevisionTime": "3-4 hours",
  "relatedWeakAreas": ["topic1", "topic2"]
}`;

  try {
    const raw    = await generateText(prompt, { temperature: 0.3, numPredict: 800 });
    const parsed = extractJSON(raw);
    if (!parsed) throw new Error('Invalid weakness JSON');
    return parsed;
  } catch (err) {
    console.error('analyzeWeakness error:', err.message);
    return null;
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   5. DEPENDENCY ANALYSIS
══════════════════════════════════════════════════════════════════════════════ */
const analyzeDependencies = async (topics, docSnippet = '', subject = '') => {
  const topicNames  = topics.map(t => (typeof t === 'string' ? t : t.name)).filter(Boolean);
  const subjectName = subject || topicNames[0] || 'Course';
  const singleMode  = topicNames.length === 1 && topicNames[0] === subjectName;

  const singleTopicPrompt = `You are a university professor.

Build a prerequisite tree for a student struggling with: "${subjectName}"

Return ONLY valid JSON:
{
  "treeNodes": [
    { "id": "root",  "name": "${subjectName}", "level": 0, "parentId": null },
    { "id": "l1-0",  "name": "Direct Prerequisite A", "level": 1, "parentId": "root" },
    { "id": "l1-1",  "name": "Direct Prerequisite B", "level": 1, "parentId": "root" },
    { "id": "l1-2",  "name": "Direct Prerequisite C", "level": 1, "parentId": "root" },
    { "id": "l2-0",  "name": "Foundation of A", "level": 2, "parentId": "l1-0" },
    { "id": "l2-1",  "name": "Foundation of B", "level": 2, "parentId": "l1-1" },
    { "id": "l2-2",  "name": "Foundation of C", "level": 2, "parentId": "l1-2" },
    { "id": "l3-0",  "name": "Basic Foundation", "level": 3, "parentId": "l2-0" },
    { "id": "l3-1",  "name": "Basic Foundation", "level": 3, "parentId": "l2-1" },
    { "id": "l3-2",  "name": "Basic Foundation", "level": 3, "parentId": "l2-2" }
  ],
  "dependencies": [],
  "recommendedOrder": [],
  "criticalPath": []
}`;

  const fullCoursePrompt = `You are a curriculum design expert.

Course: "${subjectName}"
Topics: ${topicNames.join(', ')}

Build a 3-level prerequisite tree (root → topics → external prerequisites → foundations).
Level 2 must be EXTERNAL concepts not from the course topics list.

Return ONLY valid JSON:
{
  "treeNodes": [
    { "id": "root", "name": "${subjectName}", "level": 0, "parentId": null },
    { "id": "l1-0", "name": "Topic Name", "level": 1, "parentId": "root" },
    { "id": "l2-0", "name": "External Prerequisite", "level": 2, "parentId": "l1-0" },
    { "id": "l3-0", "name": "Foundation", "level": 3, "parentId": "l2-0" }
  ],
  "dependencies": [],
  "recommendedOrder": [],
  "criticalPath": []
}`;

  const prompt = singleMode ? singleTopicPrompt : fullCoursePrompt;

  try {
    const raw    = await generateText(prompt, { temperature: 0.2, numPredict: 2500 });
    const parsed = extractJSON(raw);
    if (!parsed) throw new Error('Invalid dependency JSON');
    if (!Array.isArray(parsed.treeNodes) || parsed.treeNodes.length < 2)
      throw new Error('treeNodes missing or too short');
    console.log(`✅ Dependency tree: ${parsed.treeNodes.length} nodes`);
    return parsed;
  } catch (err) {
    console.error('analyzeDependencies error:', err.message);
    return null;
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   6. LEARNING PATH GENERATION
══════════════════════════════════════════════════════════════════════════════ */
const generateLearningPath = async (weakTopics, allTopics, dependencyRelationships = [], docSnippet = '') => {
  if (!weakTopics?.length) return [];

  const topicList = allTopics.join(', ');
  const depsText  = dependencyRelationships.length
    ? dependencyRelationships
        .map(r => `"${r.source}" before "${r.target}" (${r.type || 'prerequisite'})`)
        .join('\n')
    : 'No dependency data.';

  const prompt = `You are an expert learning advisor.

All topics: ${topicList}
Prerequisites:
${depsText}

Student is WEAK in: ${weakTopics.join(', ')}

For each weak topic, generate a step-by-step recovery learning path.

Respond ONLY with valid JSON:
{
  "paths": [
    {
      "weakTopic": "TopicName",
      "summary": "Recovery strategy summary",
      "estimatedTime": "X hours",
      "steps": [
        { "order": 1, "topic": "PrerequisiteTopic", "action": "Revise", "reason": "Why first" },
        { "order": 2, "topic": "WeakTopicName", "action": "Practice", "reason": "Apply knowledge" }
      ]
    }
  ]
}`;

  try {
    const raw    = await generateText(prompt, { temperature: 0.3, numPredict: 1500 });
    const parsed = extractJSON(raw);
    if (!parsed?.paths) throw new Error('No paths in response');
    console.log(`✅ Learning paths generated for: ${weakTopics.join(', ')}`);
    return parsed.paths;
  } catch (err) {
    console.error('generateLearningPath error:', err.message);
    return weakTopics.map(weakTopic => {
      const prereqs = dependencyRelationships
        .filter(r => r.target === weakTopic)
        .map(r => r.source);
      return {
        weakTopic,
        summary: `Revise prerequisites then tackle ${weakTopic}.`,
        estimatedTime: `${prereqs.length + 1} hours`,
        steps: [
          ...prereqs.map((p, i) => ({ order: i + 1, topic: p, action: 'Revise', reason: `Required for ${weakTopic}` })),
          { order: prereqs.length + 1, topic: weakTopic, action: 'Practice', reason: 'Apply revised knowledge' },
        ],
      };
    });
  }
};

/* ─── legacy wrapper ────────────────────────────────────────────────────── */
const generateAdvancedQuestions = async (topics, context = '') => {
  const topicObjects = Array.isArray(topics)
    ? topics.map(t => (typeof t === 'string' ? { name: t } : t))
    : [{ name: topics }];
  return generateDocumentQuestions(topicObjects, context)
    .then(qs => qs.map(q => q.question));
};

module.exports = {
  testOllamaConnection,
  testGeminiConnection,
  generateText,
  extractTopicsAdvanced,
  generateDocumentQuestions,
  generateAdvancedQuestions,
  evaluateAnswer,
  analyzeWeakness,
  analyzeDependencies,
  generateLearningPath,
};
