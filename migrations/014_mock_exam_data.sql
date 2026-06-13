-- 模考数据初始化
-- 创建时间: 2026-06-11
-- 版本: 014

INSERT INTO mock_exams (id, title, description, level, duration, questions) VALUES 
(
  md5('cet4_mock_1')::uuid,
  '2024年6月四级真题模拟',
  '本次模拟考试基于2024年6月四级真题，包含完整的听力、阅读、翻译和写作四个部分，全面检验你的英语水平。',
  'cet4',
  130,
  '[
    {
      "id": "q1",
      "title": "听力第1题",
      "content": "News Report One\n\nThe World Health Organization says air pollution is now the world''s single biggest environmental health risk. It estimates that every year, air pollution causes seven million deaths. That number comes from a new WHO report released this week. The report says 92 percent of the world''s population lives in areas where air quality levels exceed WHO limits. It also says new information shows air pollution affects almost every part of the body.",
      "type": "listening",
      "score": 7,
      "answer": "A",
      "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      "options": [
        {"label": "Air pollution is the biggest environmental health risk", "value": "A"},
        {"label": "Air pollution causes 700,000 deaths yearly", "value": "B"},
        {"label": "Only 8% of people live in polluted areas", "value": "C"},
        {"label": "Air pollution only affects respiratory system", "value": "D"}
      ]
    },
    {
      "id": "q2",
      "title": "听力第2题",
      "content": "Conversation One\n\nW: Hi, John. How''s your research going?\nM: Well, it''s going pretty well. I''m studying the effects of social media on teenagers'' mental health.\nW: That sounds interesting. What have you found so far?\nM: Well, I''ve discovered that excessive use of social media is associated with increased anxiety and depression among young people.",
      "type": "listening",
      "score": 7,
      "answer": "B",
      "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      "options": [
        {"label": "John is studying environmental issues", "value": "A"},
        {"label": "Excessive social media use links to anxiety", "value": "B"},
        {"label": "Social media has no effect on mental health", "value": "C"},
        {"label": "John''s research is about physical health", "value": "D"}
      ]
    },
    {
      "id": "q3",
      "title": "听力第3题",
      "content": "Passage One\n\nThe concept of \"work-life balance\" has become increasingly important in today''s fast-paced world. Many companies are now recognizing the importance of allowing employees to have flexible work arrangements. This not only benefits the employees but also improves productivity and job satisfaction. Studies show that workers who have control over their work schedules are more engaged and less likely to experience burnout.",
      "type": "listening",
      "score": 7,
      "answer": "C",
      "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      "options": [
        {"label": "Work-life balance is not important", "value": "A"},
        {"label": "Flexible work reduces productivity", "value": "B"},
        {"label": "Flexible schedules benefit both employees and companies", "value": "C"},
        {"label": "Burnout is not related to work schedules", "value": "D"}
      ]
    },
    {
      "id": "q4",
      "title": "选词填空",
      "content": "In recent years, there has been a growing interest in sustainable living. More and more people are choosing to ___1___ eco-friendly products and reduce their carbon ___2___. This trend is not only good for the environment but also helps individuals save money in the long ___3___.",
      "type": "reading_cloze",
      "score": 15,
      "answer": "purchase,footprint,run",
      "word_bank": ["purchase", "footprint", "run", "waste", "recycle", "energy", "consume", "emission"]
    },
    {
      "id": "q5",
      "title": "段落匹配",
      "content": "",
      "type": "reading_matching",
      "score": 10,
      "answer": "A-1,B-3,C-2,D-4",
      "paragraphs": [
        "Artificial intelligence has become an integral part of modern technology. From voice assistants to self-driving cars, AI is transforming various aspects of our daily lives. Its applications continue to expand, making tasks more efficient and convenient.",
        "Climate change poses significant challenges to our planet. Rising temperatures, melting ice caps, and extreme weather events are just some of the consequences we face. Immediate action is needed to mitigate these effects.",
        "Education plays a crucial role in personal development. It not only provides knowledge but also helps individuals develop critical thinking skills and prepare for future careers. A good education system is essential for societal progress.",
        "Globalization has connected the world like never before. Through international trade, communication, and cultural exchange, countries have become more interdependent. This has both positive and negative implications for economies and societies."
      ],
      "options": [
        {"label": "AI is transforming daily life applications", "value": "A"},
        {"label": "Education develops critical thinking skills", "value": "B"},
        {"label": "Climate change requires immediate action", "value": "C"},
        {"label": "Globalization increases international interdependence", "value": "D"}
      ]
    },
    {
      "id": "q6",
      "title": "仔细阅读",
      "content": "The future of work is undergoing significant transformation. With the rapid advancement of technology, many traditional jobs are being automated, while new roles are emerging in fields such as data science, artificial intelligence, and renewable energy. This shift requires workers to continuously update their skills and adapt to new technologies. Lifelong learning has become essential for career success in the 21st century.",
      "type": "reading_careful",
      "score": 10,
      "answer": "D",
      "options": [
        {"label": "Technology has no impact on jobs", "value": "A"},
        {"label": "Traditional jobs are not affected by automation", "value": "B"},
        {"label": "Lifelong learning is no longer necessary", "value": "C"},
        {"label": "Workers need to adapt to new technologies", "value": "D"}
      ]
    },
    {
      "id": "q7",
      "title": "翻译",
      "content": "中国是一个拥有悠久历史和灿烂文化的国家。中国文化博大精深，包括传统艺术、哲学思想、节日习俗等诸多方面。随着中国的发展，越来越多的人开始关注和学习中国文化。",
      "type": "translation",
      "score": 15,
      "answer": "China is a country with a long history and splendid culture. Chinese culture is extensive and profound, encompassing traditional arts, philosophical ideas, festivals and customs, and many other aspects. With China''s development, more and more people are beginning to pay attention to and learn about Chinese culture."
    },
    {
      "id": "q8",
      "title": "写作：My Campus Life",
      "content": "请以\"My Campus Life\"为题写一篇短文，描述你的大学生活。",
      "type": "writing",
      "score": 20,
      "requirements": "1. 字数要求：120-180词\n2. 内容要求：描述校园生活的主要方面，如学习、课外活动、人际关系等\n3. 语言要求：用词准确，语法正确，表达流畅"
    }
  ]'
),
(
  md5('cet4_mock_2')::uuid,
  '四级模拟试卷（综合能力测试）',
  '全面测试四级英语各项能力，包含完整的四六级题型。',
  'cet4',
  120,
  '[
    {
      "id": "q1",
      "title": "听力第1题",
      "content": "News Report Two\n\nA recent survey shows that more than half of young people in urban areas suffer from sleep deprivation. The main reasons include excessive screen time before bed, irregular sleep schedules, and high levels of stress. Experts recommend establishing a regular sleep routine and avoiding electronic devices at least one hour before bedtime.",
      "type": "listening",
      "score": 7,
      "answer": "B",
      "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
      "options": [
        {"label": "Most young people sleep well", "value": "A"},
        {"label": "Screen time affects sleep quality", "value": "B"},
        {"label": "Stress has no impact on sleep", "value": "C"},
        {"label": "Experts suggest using devices before bed", "value": "D"}
      ]
    },
    {
      "id": "q2",
      "title": "听力第2题",
      "content": "Conversation Two\n\nM: Have you read the new book on climate change?\nW: Yes, I have. It''s really eye-opening. The author argues that we need to take immediate action to reduce carbon emissions.\nM: I agree. The data presented in the book is quite compelling. It''s clear that we can''t continue with business as usual.",
      "type": "listening",
      "score": 7,
      "answer": "A",
      "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
      "options": [
        {"label": "The book emphasizes the need for immediate action", "value": "A"},
        {"label": "Carbon emissions are not a problem", "value": "B"},
        {"label": "The book presents no compelling data", "value": "C"},
        {"label": "Business as usual is acceptable", "value": "D"}
      ]
    },
    {
      "id": "q3",
      "title": "选词填空",
      "content": "Online learning has become increasingly ___1___ in recent years. With the ___2___ of the internet, students can now access educational resources from anywhere in the world. This has made education more ___3___ and flexible.",
      "type": "reading_cloze",
      "score": 15,
      "answer": "popular,development,accessible",
      "word_bank": ["popular", "development", "accessible", "traditional", "technology", "expensive", "limited", "available"]
    },
    {
      "id": "q4",
      "title": "仔细阅读",
      "content": "Mobile technology has revolutionized the way we communicate. Smartphones have become an essential part of daily life, allowing people to stay connected anytime, anywhere. However, excessive use can lead to addiction and negative effects on mental health. It''s important to find a balance between staying connected and disconnecting to enjoy real-life experiences.",
      "type": "reading_careful",
      "score": 10,
      "answer": "C",
      "options": [
        {"label": "Mobile technology has no impact on communication", "value": "A"},
        {"label": "Smartphones are not essential", "value": "B"},
        {"label": "Excessive smartphone use can be harmful", "value": "C"},
        {"label": "People should always stay connected", "value": "D"}
      ]
    },
    {
      "id": "q5",
      "title": "翻译",
      "content": "随着科技的快速发展，人们的生活方式发生了巨大变化。互联网、智能手机和人工智能等新技术改变了我们的工作、学习和娱乐方式。",
      "type": "translation",
      "score": 15,
      "answer": "With the rapid development of technology, people''s lifestyles have changed dramatically. New technologies such as the internet, smartphones, and artificial intelligence have transformed the way we work, study, and entertain."
    },
    {
      "id": "q6",
      "title": "写作：The Importance of Reading",
      "content": "请以\"The Importance of Reading\"为题写一篇议论文，阐述阅读的重要性。",
      "type": "writing",
      "score": 25,
      "requirements": "1. 字数要求：150-200词\n2. 内容要求：论述阅读对个人成长和知识积累的重要性\n3. 结构清晰，论点明确"
    }
  ]'
),
(
  md5('cet6_mock_1')::uuid,
  '2024年12月六级真题模拟',
  '基于2024年12月六级真题改编，包含完整的六级考试题型。',
  'cet6',
  130,
  '[
    {
      "id": "q1",
      "title": "听力第1题",
      "content": "Lecture One\n\nToday, I''d like to discuss the future of artificial intelligence. AI has already made significant advances in various fields, from healthcare to finance. However, there are important ethical considerations that need to be addressed as AI continues to develop. Issues such as privacy, bias, and job displacement must be carefully managed to ensure that AI benefits all of society.",
      "type": "listening",
      "score": 10,
      "answer": "C",
      "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
      "options": [
        {"label": "AI has made no advances", "value": "A"},
        {"label": "Ethical issues are not important for AI", "value": "B"},
        {"label": "AI development raises important ethical concerns", "value": "C"},
        {"label": "AI will not affect jobs", "value": "D"}
      ]
    },
    {
      "id": "q2",
      "title": "听力第2题",
      "content": "Conversation Three\n\nW: Professor, I''m interested in your research on renewable energy.\nM: Thank you. We''re currently studying the feasibility of solar and wind energy as alternatives to fossil fuels.\nW: What are the main challenges you''re facing?\nM: Well, the main challenges include storage capacity and the high initial costs of installation. However, we''re making progress in both areas.",
      "type": "listening",
      "score": 10,
      "answer": "B",
      "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
      "options": [
        {"label": "Renewable energy has no challenges", "value": "A"},
        {"label": "Storage capacity is a challenge for renewable energy", "value": "B"},
        {"label": "Solar energy is not feasible", "value": "C"},
        {"label": "Installation costs are low", "value": "D"}
      ]
    },
    {
      "id": "q3",
      "title": "选词填空",
      "content": "The rapid ___1___ of artificial intelligence has sparked widespread debate about its implications. While some see AI as a tool for progress and innovation, others express ___2___ about its potential risks. It is crucial to ___3___ a balanced approach that maximizes benefits while minimizing risks.",
      "type": "reading_cloze",
      "score": 15,
      "answer": "development,concerns,adopt",
      "word_bank": ["development", "concerns", "adopt", "reject", "optimism", "technology", "ignore", "challenge"]
    },
    {
      "id": "q4",
      "title": "段落匹配",
      "content": "",
      "type": "reading_matching",
      "score": 10,
      "answer": "A-2,B-4,C-1,D-3",
      "paragraphs": [
        "The concept of smart cities has gained significant attention in recent years. These cities leverage technology to improve efficiency, sustainability, and quality of life. Through IoT devices and data analytics, smart cities aim to create more livable urban environments.",
        "Big data has transformed how businesses operate. By analyzing large datasets, companies can gain valuable insights into consumer behavior, optimize operations, and make data-driven decisions. This has become essential for staying competitive in today''s market.",
        "Cybersecurity has become a critical concern in the digital age. With increasing connectivity, the risk of cyber attacks has grown significantly. Organizations must invest in robust security measures to protect sensitive information and maintain customer trust.",
        "Remote work has become increasingly prevalent, accelerated by recent global events. This shift has changed traditional workplace dynamics, offering greater flexibility for employees while presenting new challenges for management and team collaboration."
      ],
      "options": [
        {"label": "Big data provides valuable business insights", "value": "A"},
        {"label": "Remote work offers flexibility but also challenges", "value": "B"},
        {"label": "Smart cities use technology to improve urban living", "value": "C"},
        {"label": "Cybersecurity is essential in the digital age", "value": "D"}
      ]
    },
    {
      "id": "q5",
      "title": "仔细阅读",
      "content": "Globalization has significantly impacted the world economy. While it has brought economic growth and increased international trade, it has also led to growing inequality and cultural homogenization. As countries become more interconnected, it''s important to find ways to ensure that the benefits of globalization are shared more equitably. This requires cooperation among nations and policies that promote sustainable development.",
      "type": "reading_careful",
      "score": 10,
      "answer": "D",
      "options": [
        {"label": "Globalization has no negative effects", "value": "A"},
        {"label": "Globalization reduces international trade", "value": "B"},
        {"label": "Inequality is not related to globalization", "value": "C"},
        {"label": "Globalization requires equitable sharing of benefits", "value": "D"}
      ]
    },
    {
      "id": "q6",
      "title": "翻译",
      "content": "随着经济全球化的深入发展，中国与世界各国的交流与合作日益频繁。中国坚持对外开放的基本国策，积极参与国际事务，为世界和平与发展作出了重要贡献。",
      "type": "translation",
      "score": 20,
      "answer": "With the deepening development of economic globalization, China''s exchanges and cooperation with countries around the world have become increasingly frequent. Adhering to the basic national policy of opening up, China actively participates in international affairs and has made important contributions to world peace and development."
    },
    {
      "id": "q7",
      "title": "写作：The Influence of Social Media",
      "content": "请以\"The Influence of Social Media on Modern Society\"为题写一篇议论文。",
      "type": "writing",
      "score": 25,
      "requirements": "1. 字数要求：180-220词\n2. 内容要求：分析社交媒体对现代社会的积极和消极影响\n3. 要求结构严谨，论证充分"
    }
  ]'
),
(
  md5('cet6_mock_2')::uuid,
  '六级模拟试卷（进阶版）',
  '针对六级考试的难点进行专项训练，提升应试能力。',
  'cet6',
  120,
  '[
    {
      "id": "q1",
      "title": "听力第1题",
      "content": "Lecture Two\n\nThe concept of emotional intelligence has gained significant recognition in recent years. Unlike traditional intelligence, which focuses on cognitive abilities, emotional intelligence involves the ability to recognize, understand, and manage emotions—both in oneself and others. Research shows that emotional intelligence is a key predictor of success in both personal and professional life.",
      "type": "listening",
      "score": 10,
      "answer": "A",
      "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
      "options": [
        {"label": "Emotional intelligence involves managing emotions", "value": "A"},
        {"label": "Emotional intelligence is the same as traditional intelligence", "value": "B"},
        {"label": "Emotional intelligence has no impact on success", "value": "C"},
        {"label": "Emotional intelligence only focuses on self-awareness", "value": "D"}
      ]
    },
    {
      "id": "q2",
      "title": "选词填空",
      "content": "The ___1___ of climate change requires immediate and collective action. Governments, businesses, and individuals all have a role to play in reducing greenhouse gas ___2___. By working together, we can mitigate the effects of climate change and create a more ___3___ future for generations to come.",
      "type": "reading_cloze",
      "score": 15,
      "answer": "challenge,emissions,sustainable",
      "word_bank": ["challenge", "emissions", "sustainable", "ignore", "pollution", "technology", "dangerous", "immediate"]
    },
    {
      "id": "q3",
      "title": "仔细阅读",
      "content": "The sharing economy has transformed various industries, from transportation to accommodation. Platforms like ride-sharing and home-sharing apps have changed how people access services and resources. While this model offers convenience and economic benefits, it also raises questions about regulation, worker rights, and economic inequality. Finding the right balance between innovation and protection remains a challenge.",
      "type": "reading_careful",
      "score": 10,
      "answer": "B",
      "options": [
        {"label": "The sharing economy has no impact on industries", "value": "A"},
        {"label": "The sharing economy raises regulatory questions", "value": "B"},
        {"label": "Worker rights are not affected by sharing economy", "value": "C"},
        {"label": "The sharing economy only has benefits", "value": "D"}
      ]
    },
    {
      "id": "q4",
      "title": "翻译",
      "content": "创新是推动社会进步的重要动力。在当今快速变化的世界中，创新能力变得越来越重要。各国政府和企业都在加大对创新的投入，以保持竞争力并解决全球性挑战。",
      "type": "translation",
      "score": 20,
      "answer": "Innovation is an important driving force for social progress. In today''s rapidly changing world, innovation capability has become increasingly important. Governments and businesses around the world are increasing their investment in innovation to maintain competitiveness and address global challenges."
    },
    {
      "id": "q5",
      "title": "写作：Artificial Intelligence",
      "content": "请以\"Artificial Intelligence: Opportunities and Challenges\"为题写一篇议论文。",
      "type": "writing",
      "score": 25,
      "requirements": "1. 字数要求：200-250词\n2. 内容要求：讨论人工智能带来的机遇和挑战\n3. 语言要求：用词精准，句式多样"
    }
  ]'
)
ON CONFLICT (id) DO NOTHING;

SELECT 'Mock exam data initialized' AS result;