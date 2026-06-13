-- 四六级英语写作智能辅导网站初始数据
-- 创建时间: 2026-05-31

-- =============================================
-- 1. 素材数据 (materials)
-- =============================================

-- 高频主题素材
INSERT INTO materials (title, content, translation, category, type, tags, usage_scenario, tips, is_common, level, favorites_count) VALUES
('教育学习类高分词汇', 
'In the realm of education, the significance of lifelong learning cannot be overstated. Continuous education serves as a catalyst for personal growth and social advancement.',
'在教育领域，终身学习的重要性不容小觑。持续教育是个人成长和社会进步的催化剂。',
'topic', '教育学习', ARRAY['教育', '学习', '成长', '社会'],
'适用于讨论教育重要性、终身学习、个人发展等话题的作文开头或论点部分',
'避免使用过于简单的 "important" 或 "significant"，使用 cannot be overstated 更显语言地道',
true, NULL, 1234),

('科技发展类核心表达',
'With the rapid advancement of technology, our daily lives have undergone tremendous changes. The digital revolution has reshaped the way we communicate, work, and entertain ourselves.',
'随着科技的快速发展，我们的日常生活发生了巨大变化。数字革命重塑了我们沟通、工作和娱乐的方式。',
'topic', '科技网络', ARRAY['科技', '发展', '数字', '变革'],
'适用于讨论科技影响、互联网发展、数字化时代等话题',
'使用 undergone tremendous changes 替代 has changed a lot，提升表达层次',
true, NULL, 2156),

('环境保护类高分表达',
'Environmental degradation poses an unprecedented threat to our planet. It is imperative that we take concerted efforts to safeguard the ecosystem for future generations.',
'环境恶化对我们的星球构成了前所未有的威胁。我们必须共同努力保护生态系统，为后代谋福祉。',
'topic', '环境健康', ARRAY['环境', '保护', '生态', '可持续发展'],
'适用于讨论环境保护、气候变化、可持续发展等话题',
'使用 unprecedented threat 和 concerted efforts 等高级表达',
true, NULL, 1876),

('文化交流类素材',
'Cultural exchange serves as a bridge connecting diverse civilizations. Through mutual understanding and respect, we can foster a more harmonious global community.',
'文化交流是连接不同文明的桥梁。通过相互理解和尊重，我们可以促进更加和谐的国际社会。',
'topic', '文化交流', ARRAY['文化', '交流', '理解', '和谐'],
'适用于讨论跨文化交流、国际合作、文化多样性等话题',
'使用 serves as a bridge 和 foster 等表达',
true, NULL, 1567),

('个人成长类素材',
'Personal development is a lifelong journey that requires perseverance and self-reflection. Embracing challenges and learning from failures are essential steps toward self-improvement.',
'个人发展是一段终生的旅程，需要毅力和自我反思。拥抱挑战并从失败中学习是自我提升的关键步骤。',
'topic', '个人成长', ARRAY['成长', '发展', '挑战', '自我提升'],
'适用于讨论个人发展、成长经历、面对挑战等话题',
'使用 lifelong journey 和 embracing challenges 等表达',
true, NULL, 1432);

-- 高分句式素材
INSERT INTO materials (title, content, translation, category, type, tags, usage_scenario, tips, is_common, level, favorites_count) VALUES
('转折递进句式',
'While it is true that..., it is equally important to recognize that... Nevertheless, we should not overlook the fact that...',
'虽然...是事实，但同样重要的是认识到...然而，我们不应忽视...这一事实',
'sentence', '转折递进', ARRAY['转折', '递进', '对比', '论证'],
'适用于需要对比观点、转折论证的段落中，体现逻辑深度',
'这种句式能有效提升文章逻辑深度，六级写作推荐使用',
true, NULL, 3421),

('因果论证句式',
'The primary reason for this phenomenon lies in... Consequently, this has led to... Furthermore, it is worth noting that...',
'这一现象的主要原因在于...因此，这导致了...此外，值得注意的是...',
'sentence', '因果论证', ARRAY['因果', '论证', '分析', '推理'],
'适用于分析现象原因、论证观点的段落',
'使用 lies in 和 consequently 等连接词，使论证更有条理',
true, NULL, 2876),

('观点表达句式',
'There is a growing consensus that... From my perspective, I firmly believe that... This view is supported by the fact that...',
'越来越多的人认为...从我的角度来看，我坚信...这一观点得到以下事实的支持...',
'sentence', '观点表达', ARRAY['观点', '表达', '论证', '立场'],
'适用于表达个人观点、论证立场的段落开头',
'使用 growing consensus 和 firmly believe 等表达',
true, NULL, 2567),

('总结归纳句式',
'Taking all these factors into consideration, we can safely conclude that... In summary, it is evident that...',
'综合考虑所有这些因素，我们可以得出结论...总之，很明显...',
'sentence', '总结归纳', ARRAY['总结', '归纳', '结论', '结尾'],
'适用于文章结尾段落，总结全文观点',
'使用 taking into consideration 和 safely conclude 等表达',
true, NULL, 2234),

('对比论证句式',
'On the one hand, ... On the other hand, ... When comparing these two aspects, it becomes clear that...',
'一方面...另一方面...当比较这两个方面时，很明显...',
'sentence', '对比论证', ARRAY['对比', '论证', '分析', '权衡'],
'适用于对比分析、权衡利弊的段落',
'使用 on the one hand...on the other hand 结构',
true, NULL, 1987);

-- 衔接逻辑素材
INSERT INTO materials (title, content, translation, category, type, tags, usage_scenario, tips, is_common, level, favorites_count) VALUES
('高频过渡词',
'First and foremost, ... Moreover, ... In addition, ... Furthermore, ... Last but not least, ...',
'首先...此外...另外...而且...最后但同样重要的是...',
'transition', '过渡词', ARRAY['过渡', '衔接', '逻辑', '顺序'],
'适用于段落内部和段落之间的逻辑衔接',
'注意过渡词的使用顺序，避免重复',
true, NULL, 4567),

('段落衔接句型',
'Having discussed the causes, let us now turn to the effects. Building upon the previous argument, we can further explore...',
'讨论完原因后，让我们转向影响。基于前面的论证，我们可以进一步探讨...',
'transition', '段落衔接', ARRAY['段落', '衔接', '过渡', '逻辑'],
'适用于段落之间的过渡衔接',
'使用 let us now turn to 和 building upon 等表达',
true, NULL, 3234);

-- 文体格式素材
INSERT INTO materials (title, content, translation, category, type, tags, usage_scenario, tips, is_common, level, favorites_count) VALUES
('书信格式规范',
'Dear Sir or Madam,

I am writing to express my concern regarding...

I would be grateful if you could...

Yours faithfully,
[Your Name]',
'尊敬的先生/女士，

我写信是为了表达关于...的担忧。

如果您能...我将不胜感激。

此致敬礼，
[您的姓名]',
'format', '书信', ARRAY['书信', '格式', '正式', '应用文'],
'适用于四级书信类应用文，注意称呼和结尾格式',
'四级书信必考内容，注意 Yours faithfully 与 Yours sincerely 的使用场景',
true, 'cet4', 5678),

('通知格式规范',
'NOTICE

[Title]

To: [Target Audience]

Date: [Date]

[Content]

[Organization Name]
[Date]',
'通知

[标题]

致：[目标受众]

日期：[日期]

[正文内容]

[组织名称]
[日期]',
'format', '通知', ARRAY['通知', '格式', '应用文', '四级'],
'适用于四级通知类应用文',
'通知标题居中，正文简洁明了',
true, 'cet4', 4567),

('倡议书格式规范',
'A Proposal on [Topic]

Dear fellow students,

I am writing to propose that...

Firstly, it is suggested that...

Secondly, we should...

Let us take action together to...

[Your Name]
[Organization]
[Date]',
'关于[主题]的倡议书

亲爱的同学们，

我写信提议...

首先，建议...

其次，我们应该...

让我们共同行动...

[您的姓名]
[组织]
[日期]',
'format', '倡议书', ARRAY['倡议书', '格式', '应用文', '四级'],
'适用于四级倡议书类应用文',
'倡议书要有号召力，结尾要有行动呼吁',
true, 'cet4', 3456),

('议论文标准结构',
'Introduction:
- Present the topic and state your thesis
- Provide background information

Body Paragraphs:
- First argument with supporting evidence
- Second argument with supporting evidence
- Third argument (optional)

Conclusion:
- Summarize main points
- Restate thesis
- Provide final thoughts or recommendations',
'引言：
- 提出话题并陈述论点
- 提供背景信息

主体段落：
- 第一个论点及支持证据
- 第二个论点及支持证据
- 第三个论点（可选）

结论：
- 总结要点
- 重述论点
- 提供最终思考或建议',
'format', '议论文', ARRAY['议论文', '结构', '框架', '六级'],
'适用于六级议论文写作',
'六级议论文要求逻辑深度，注意论证的层次性',
true, 'cet6', 6789);

-- 万能开头结尾素材
INSERT INTO materials (title, content, translation, category, type, tags, usage_scenario, tips, is_common, level, favorites_count) VALUES
('议论文万能开头',
'In recent years, the issue of [topic] has aroused widespread concern. It has become a hot topic among the general public. Different people hold different views on this matter.',
'近年来，[话题]问题引起了广泛关注。它已成为公众热议的话题。不同的人对此持有不同的看法。',
'opening', '议论文', ARRAY['开头', '引入', '议论文', '万能'],
'适用于议论文开头，引出话题',
'可根据具体话题替换 [topic] 内容',
true, NULL, 7890),

('议论文万能结尾',
'Taking all these factors into consideration, we may reasonably arrive at the conclusion that... Only through concerted efforts can we effectively address this issue and create a better future.',
'综合考虑所有这些因素，我们可以得出结论...只有通过共同努力，我们才能有效解决这个问题，创造更美好的未来。',
'closing', '议论文', ARRAY['结尾', '总结', '议论文', '万能'],
'适用于议论文结尾，总结观点',
'使用 reasonably arrive at the conclusion 等高级表达',
true, NULL, 6543),

('书信万能开头',
'I am writing to express my [feeling] regarding [topic]. As a [your identity], I feel compelled to share my thoughts on this matter.',
'我写信是为了表达关于[话题]的[感受]。作为[您的身份]，我觉得有必要分享我对这件事的想法。',
'opening', '书信', ARRAY['开头', '书信', '应用文', '万能'],
'适用于书信类应用文开头',
'可根据具体情境替换 [feeling] 和 [topic]',
true, 'cet4', 5678),

('书信万能结尾',
'I would appreciate it if you could take my suggestions into consideration. I look forward to your reply at your earliest convenience.',
'如果您能考虑我的建议，我将不胜感激。期待您尽早回复。',
'closing', '书信', ARRAY['结尾', '书信', '应用文', '万能'],
'适用于书信类应用文结尾',
'使用 at your earliest convenience 等礼貌表达',
true, 'cet4', 4567);

-- =============================================
-- 2. 题目数据 (questions)
-- =============================================

INSERT INTO questions (title, content, requirements, type, level, topic, difficulty, year, word_count_min, word_count_max) VALUES
('2025年6月四级真题 - 建议信',
'Directions: For this part, you are allowed 30 minutes to write a letter to a foreign friend who wants to learn Chinese. Suggest some reputable language schools or resources for him/her. You should write at least 120 words but no more than 180 words.',
'建议信，字数120-180词',
'letter', 'cet4', '文化交流', 'medium', 2025, 120, 180),

('2025年6月四级真题 - 通知',
'Directions: For this part, you are allowed 30 minutes to write a notice for the Student Union about a volunteer activity. Include the time, place, and how to sign up. You should write at least 80 words but no more than 120 words.',
'通知，字数80-120词',
'notice', 'cet4', '志愿服务', 'easy', 2025, 80, 120),

('2025年12月四级真题 - 倡议书',
'Directions: For this part, you are allowed 30 minutes to write a proposal for improving campus facilities. You should write at least 100 words but no more than 120 words.',
'倡议书，字数100-120词',
'proposal', 'cet4', '校园生活', 'medium', 2025, 100, 120),

('2024年6月四级真题 - 书信',
'Directions: For this part, you are allowed 30 minutes to write a letter to your university library, suggesting improvements to its services. You should write at least 120 words but no more than 180 words.',
'建议信，字数120-180词',
'letter', 'cet4', '校园生活', 'medium', 2024, 120, 180),

('2025年6月六级真题 - 议论文',
'Directions: For this part, you are allowed 30 minutes to write an essay based on the following topic. The impact of artificial intelligence on the job market is a double-edged sword. Discuss both the opportunities and challenges it brings. You should write at least 150 words but no more than 200 words.',
'议论文，字数150-200词',
'argumentative', 'cet6', '科技发展', 'hard', 2025, 150, 200),

('2025年12月六级真题 - 议论文',
'Directions: For this part, you are allowed 30 minutes to write an essay on the importance of critical thinking in the digital age. You should write at least 150 words but no more than 200 words.',
'议论文，字数150-200词',
'argumentative', 'cet6', '教育学习', 'hard', 2025, 150, 200),

('2024年6月六级真题 - 议论文',
'Directions: For this part, you are allowed 30 minutes to write an essay on the topic "The Role of Cultural Exchange in Global Harmony". You should write at least 150 words but no more than 200 words.',
'议论文，字数150-200词',
'argumentative', 'cet6', '文化交流', 'hard', 2024, 150, 200),

('模拟题 - 四级议论文',
'Directions: For this part, you are allowed 30 minutes to write an essay on the topic "The Importance of Time Management". You should write at least 120 words but no more than 180 words.',
'议论文，字数120-180词',
'argumentative', 'cet4', '个人成长', 'medium', NULL, 120, 180),

('模拟题 - 四级海报',
'Directions: For this part, you are allowed 30 minutes to write a poster for an English speech contest. Include the time, place, and requirements. You should write at least 80 words but no more than 120 words.',
'海报，字数80-120词',
'poster', 'cet4', '校园活动', 'easy', NULL, 80, 120),

('模拟题 - 六级议论文',
'Directions: For this part, you are allowed 30 minutes to write an essay on the topic "The Balance Between Work and Life". You should write at least 150 words but no more than 200 words.',
'议论文，字数150-200词',
'argumentative', 'cet6', '职场生活', 'hard', NULL, 150, 200);

-- =============================================
-- 3. 模考数据 (mock_exams)
-- =============================================

INSERT INTO mock_exams (title, description, level, duration, questions) VALUES
('四级写作全真模拟（一）',
'包含1道议论文写作，模拟真实考场环境',
'cet4', 30,
'[{"question_id": "模拟题 - 四级议论文", "type": "argumentative"}]'::jsonb),

('四级写作全真模拟（二）',
'包含1道应用文写作，测试格式掌握',
'cet4', 30,
'[{"question_id": "2025年6月四级真题 - 建议信", "type": "letter"}]'::jsonb),

('六级写作全真模拟（一）',
'六级议论文专项模拟，难度适中',
'cet6', 30,
'[{"question_id": "2025年6月六级真题 - 议论文", "type": "argumentative"}]'::jsonb),

('四级综合模考',
'整合多道写作题目，全面测试',
'cet4', 60,
'[{"question_id": "2025年6月四级真题 - 建议信", "type": "letter"}, {"question_id": "模拟题 - 四级议论文", "type": "argumentative"}]'::jsonb),

('六级综合模考',
'六级综合写作能力测试',
'cet6', 60,
'[{"question_id": "2025年6月六级真题 - 议论文", "type": "argumentative"}, {"question_id": "2025年12月六级真题 - 议论文", "type": "argumentative"}]'::jsonb);

-- =============================================
-- 说明：如何填充用户数据
-- =============================================

-- 用户数据通常通过应用注册接口创建，示例：
-- INSERT INTO users (username, email, password_hash, level) VALUES
-- ('testuser', 'test@example.com', 'hashed_password_here', 'cet4');

-- 草稿和批改数据通过应用使用过程中自动生成

-- 打卡记录示例：
-- INSERT INTO checkins (user_id, date, type) VALUES
-- ('user_uuid_here', '2026-05-31', 'material');

-- 训练记录示例：
-- INSERT INTO training_records (user_id, type, answer, score, feedback) VALUES
-- ('user_uuid_here', 'topic', '学生答案', 8, 'AI反馈内容');