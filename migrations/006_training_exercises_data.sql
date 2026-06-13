-- 专项训练练习初始数据
-- 创建时间: 2026-06-01

SET client_encoding = 'UTF8';

-- =============================================
-- 1. 审题构思练习 (topic_analysis)
-- =============================================

-- 四级审题练习
INSERT INTO training_exercises (type, title, content, requirements, level, answer, sort_order) VALUES
('topic_analysis', '四级建议信审题',
'Directions: For this part, you are allowed 30 minutes to write a letter to a foreign friend who wants to learn Chinese. You should suggest some reputable language schools or resources for him/her. You should write at least 120 words but no more than 180 words.',
'请仔细阅读题目，完成审题分析：确定核心主旨、文体类型、行文框架',
'cet4',
'{"mainPoint": "向想学中文的外国朋友推荐靠谱的中文学习学校和资源", "writingType": "建议信", "structure": ["开头：问候并说明写信目的——得知朋友想学中文，提供建议", "主体：分点推荐学习资源（如语言学校、在线课程、中文角等），说明推荐理由", "结尾：表达祝愿，希望建议有帮助，期待反馈"]}',
1),

('topic_analysis', '四级通知审题',
'Directions: For this part, you are allowed 30 minutes to write a notice for the school English newspaper. You should introduce a campus activity that will be held next week, including the time, place, and participants. You should write at least 120 words but no more than 180 words.',
'请仔细阅读题目，完成审题分析：确定核心主旨、文体类型、行文框架',
'cet4',
'{"mainPoint": "为校英文报撰写一则校园活动通知，介绍活动的时间、地点和参与人员", "writingType": "通知", "structure": ["标题：NOTICE 居中", "正文开头：点明活动名称和主办方", "正文主体：详细介绍活动时间、地点、内容、参与对象", "正文结尾：鼓励大家参加，提供联系方式", "落款：主办方名称和日期"]}',
2),

('topic_analysis', '四级议论文审题',
'Directions: For this part, you are allowed 30 minutes to write a short essay on the topic of "The Importance of Reading". You should discuss why reading is important in the modern world and give your suggestions on how to develop good reading habits. You should write at least 120 words but no more than 180 words.',
'请仔细阅读题目，完成审题分析：确定核心主旨、文体类型、行文框架',
'cet4',
'{"mainPoint": "论述阅读在当代社会的重要性，并提出培养良好阅读习惯的建议", "writingType": "议论文", "structure": ["开头：引出话题——在数字时代阅读依然重要", "主体段落一：论述阅读的重要性（拓宽视野、提升思维、丰富知识）", "主体段落二：提出培养阅读习惯的建议（设定目标、减少屏幕时间、参加读书会等）", "结尾：总结阅读价值，呼吁重拾阅读习惯"]}',
3),

-- 六级审题练习
('topic_analysis', '六级议论文审题——AI与就业',
'Directions: For this part, you are allowed 30 minutes to write an essay on the topic of "The Impact of Artificial Intelligence on Employment". You should discuss both the positive and negative effects of AI on the job market and give your own opinion. You should write at least 150 words but no more than 200 words.',
'请仔细阅读题目，完成审题分析：确定核心主旨、文体类型、行文框架',
'cet6',
'{"mainPoint": "辩证分析人工智能对就业市场的正反两方面影响，并表达个人观点", "writingType": "议论文", "structure": ["开头：引出话题——AI技术快速发展引发就业变革的讨论", "主体段落一：分析AI带来的机遇（创造新岗位、提高生产效率、推动产业升级）", "主体段落二：分析AI带来的挑战（传统岗位消失、技能结构性失业、收入差距扩大）", "主体段落三：提出应对策略（教育改革、终身学习、社会保障体系完善）", "结尾：总结双刃剑属性，强调主动适应的重要性"]}',
4),

('topic_analysis', '六级议论文审题——文化自信',
'Directions: For this part, you are allowed 30 minutes to write an essay on "Cultural Confidence in the Era of Globalization". You should discuss the significance of maintaining cultural identity while embracing global trends. You should write at least 150 words but no more than 200 words.',
'请仔细阅读题目，完成审题分析：确定核心主旨、文体类型、行文框架',
'cet6',
'{"mainPoint": "论述全球化背景下保持文化自信的重要性，在拥抱全球化趋势的同时维护文化认同", "writingType": "议论文", "structure": ["开头：提出核心矛盾——全球化浪潮下文化交流与文化认同的张力", "主体段落一：论述文化自信的内涵和重要性（民族认同、文化软实力、国际影响力）", "主体段落二：分析如何在开放中保持文化特色（批判性吸收、创造性转化、文化输出）", "结尾：总结文化自信是全球化时代的立身之本"]}',
5);

-- =============================================
-- 2. 素材应用练习 (material_apply)
-- =============================================

-- 四级素材应用
INSERT INTO training_exercises (type, title, content, requirements, level, answer, sort_order) VALUES
('material_apply', '词汇升级——科技话题',
'The internet is very important for people in modern society. It helps us get information quickly. Many people use it every day for work and study.',
'请运用高分词汇和复杂句式对上述句子进行升级改写。提示：用更高级的表达替换基础词汇，丰富句式结构。',
'cet4',
'{"target": "The internet has become an indispensable tool in modern society, serving as a vital source of information that enables people to access knowledge instantaneously. A growing number of individuals rely on it on a daily basis for both professional tasks and academic pursuits.", "improvements": [{"original": "very important", "improved": "indispensable", "reason": "使用更高级的形容词提升表达层次"}, {"original": "helps us get information quickly", "improved": "enables people to access knowledge instantaneously", "reason": "用动词enable替代help，用access knowledge替代get information，更正式"}, {"original": "Many people use it every day", "improved": "A growing number of individuals rely on it on a daily basis", "reason": "用a growing number of替代many，rely on替代use，on a daily basis替代every day"}]}',
1),

('material_apply', '句式改写——环境保护',
'Many people think that climate change is a serious problem. We should take action to protect the environment. If we do not do anything, the situation will get worse.',
'请运用复合句、倒装句等复杂句式进行升级改写。提示：使用从句连接简单句，增加论证力度。',
'cet4',
'{"target": "There is a growing consensus that climate change poses an unprecedented threat to our planet, which necessitates immediate and collective action to safeguard the environment. Should we fail to take concrete measures, the situation is bound to deteriorate further.", "improvements": [{"original": "Many people think", "improved": "There is a growing consensus", "reason": "用there be句型和consensus替代简单表达"}, {"original": "is a serious problem", "improved": "poses an unprecedented threat", "reason": "用pose threat搭配更地道，unprecedented增强语气"}, {"original": "If we do not do anything", "improved": "Should we fail to take concrete measures", "reason": "使用倒装条件句提升句式复杂度"}]}',
2),

('material_apply', '段落扩写——终身学习',
'Lifelong learning is important. People should keep learning new things. It can help them in their career.',
'请将这段简短的论述扩写成一段完整的议论文段落。提示：增加原因分析、举例论证和结果推导。',
'cet4',
'{"target": "In an era characterized by rapid technological advancement and ever-changing market demands, the significance of lifelong learning has never been more pronounced. Continuous acquisition of new knowledge and skills not only enhances one''s professional competitiveness but also fosters personal growth and adaptability. For instance, professionals who regularly update their skill sets through online courses or workshops are far more likely to secure promotions and navigate career transitions successfully. Therefore, embracing a mindset of perpetual learning has become not merely an option but a necessity for anyone aspiring to thrive in today''s dynamic world.", "improvements": [{"original": "Lifelong learning is important", "improved": "the significance of lifelong learning has never been more pronounced", "reason": "使用高级表达替代基础陈述"}, {"original": "People should keep learning new things", "improved": "Continuous acquisition of new knowledge and skills", "reason": "用名词短语替代简单句子，更正式"}, {"original": "help them in their career", "improved": "secure promotions and navigate career transitions successfully", "reason": "具体化帮助的方式，增加论证细节"}]}',
3),

-- 六级素材应用
('material_apply', '六级词汇升级——社会议题',
'The gap between the rich and the poor is becoming bigger. This causes many problems in society. The government should do something about it.',
'请运用六级高分词汇和复杂句式进行升级改写，体现论证深度。',
'cet6',
'{"target": "The widening disparity between the affluent and the underprivileged has emerged as one of the most pressing social challenges of our time, exacerbating a multitude of societal issues ranging from social unrest to diminished economic mobility. It is imperative that the government implements comprehensive policies to bridge this chasm and foster a more equitable society.", "improvements": [{"original": "gap between the rich and the poor", "improved": "disparity between the affluent and the underprivileged", "reason": "使用disparity和affluent/underprivileged更学术化"}, {"original": "is becoming bigger", "improved": "has emerged as one of the most pressing social challenges", "reason": "使用emerge as pressing challenge提升表达层次"}, {"original": "causes many problems", "improved": "exacerbating a multitude of societal issues ranging from...", "reason": "用exacerbate替代cause，multitude of替代many，并举例说明"}]}',
4),

('material_apply', '六级句式升级——教育公平',
'Education is important for everyone. Some students cannot get good education because their families are poor. We need to help these students.',
'请运用六级水平的高级句式和论证结构进行改写。',
'cet6',
'{"target": "Access to quality education, widely acknowledged as a fundamental human right, remains unevenly distributed, with students from underprivileged backgrounds disproportionately deprived of adequate learning opportunities due to financial constraints. It is incumbent upon both the government and society at large to implement targeted interventions, such as scholarship programs and resource allocation reforms, to rectify this inequity.", "improvements": [{"original": "Education is important for everyone", "improved": "Access to quality education, widely acknowledged as a fundamental human right", "reason": "使用同位语结构和fundamental human right提升论证高度"}, {"original": "Some students cannot get good education", "improved": "students from underprivileged backgrounds disproportionately deprived of adequate learning opportunities", "reason": "使用underprivileged backgrounds和disproportionately deprived等高级表达"}, {"original": "We need to help these students", "improved": "It is incumbent upon...to implement targeted interventions...to rectify this inequity", "reason": "使用incumbent upon和rectify inequity体现正式语体"}]}',
5);

-- =============================================
-- 3. 开头结尾练习 (open_close)
-- =============================================

-- 四级开头结尾
INSERT INTO training_exercises (type, title, content, requirements, level, answer, sort_order) VALUES
('open_close', '四级开头——科技与生活',
'话题：科技与生活',
'请为该话题写一个精彩的开头段落，要求引出话题、表达观点。不少于50词。',
'cet4',
'{"sample": "With the rapid advancement of technology, our daily lives have undergone tremendous changes over the past decades. From smartphones to artificial intelligence, technological innovations have permeated every aspect of our existence. While some people embrace these innovations wholeheartedly, others express concerns about their potential drawbacks. This essay aims to explore both the benefits and challenges brought by modern technology.", "tips": ["开篇使用With引导的伴随状语引出背景", "使用From...to...列举具体例子增强画面感", "用While引导对比句展现辩证视角", "最后一句明确文章主旨"]}',
1),

('open_close', '四级结尾——环境保护',
'话题：环境保护',
'请为该话题写一个有力的结尾段落，要求总结观点、呼吁行动。不少于50词。',
'cet4',
'{"sample": "In conclusion, it is imperative that we take concerted efforts to protect our environment before it is too late. Individual actions, such as reducing waste and conserving energy, when multiplied across millions of people, can make a substantial difference. Only through collective and sustained efforts can we ensure a sustainable and prosperous future for generations to come.", "tips": ["In conclusion简洁过渡到结尾", "使用it is imperative that...强化紧迫感", "individual actions...can make a substantial difference——从个人到集体的逻辑推进", "Only through...can we...倒装句式增强结尾力度"]}',
2),

('open_close', '四级结尾——终身学习',
'话题：终身学习',
'请为该话题写一个升华性的结尾段落，呼应主题、展望未来。不少于50词。',
'cet4',
'{"sample": "To sum up, lifelong learning is not merely a choice but a necessity in today''s rapidly evolving world. As the saying goes, ''It is never too late to learn.'' By cultivating a passion for continuous self-improvement, we can not only enhance our career prospects but also lead more fulfilling lives. Let us embrace the journey of learning with an open mind and unwavering determination.", "tips": ["not merely...but...强调必要性", "引用谚语增加文采", "not only...but also...递进论证", "以呼吁/祝愿收尾"]}',
3),

-- 六级开头结尾
('open_close', '六级开头——全球化与文化',
'话题：全球化与文化多样性',
'请为该六级话题写一个分析性的开头段落，要求引出争议、展现思辨深度。不少于60词。',
'cet6',
'{"sample": "In an era of unprecedented global interconnectedness, the tension between cultural homogenization and the preservation of cultural diversity has become increasingly pronounced. While globalization has undoubtedly facilitated cross-cultural exchange and mutual understanding, it has simultaneously raised concerns about the erosion of indigenous traditions and local identities. This essay seeks to examine the intricate relationship between globalization and cultural diversity, arguing that these two forces need not be mutually exclusive.", "tips": ["开篇使用unprecedented global interconnectedness定调学术高度", "使用cultural homogenization vs cultural diversity建立二元对立", "has undoubtedly...has simultaneously...展现辩证思维", "these two forces need not be mutually exclusive亮出核心论点"]}',
4),

('open_close', '六级结尾——人工智能伦理',
'话题：人工智能的伦理挑战',
'请为该六级话题写一个深度总结性的结尾段落，要求呼应观点、提出前瞻性思考。不少于60词。',
'cet6',
'{"sample": "In the final analysis, the ethical dilemmas posed by artificial intelligence demand our urgent attention and collective wisdom. Striking a delicate balance between technological innovation and ethical constraints is not an easy task, yet it is one that we cannot afford to neglect. As we stand at the crossroads of unprecedented technological advancement, the decisions we make today regarding AI governance will undoubtedly shape the trajectory of human civilization for decades to come.", "tips": ["In the final analysis替代简单总结词，更正式", "Striking a delicate balance between...生动比喻", "we stand at the crossroads of...文学化表达", "decisions...will shape the trajectory...前瞻性展望"]}',
5);

-- =============================================
-- 4. 格式规范练习 (format)
-- =============================================

-- 四级格式
INSERT INTO training_exercises (type, title, content, requirements, level, answer, sort_order) VALUES
('format', '四级书信格式——建议信',
'你的英国朋友Tom想来中国学习中文，请你给他写一封信，提供一些关于中文学习的建议。请完成书信的标准格式写作。',
'请按照书信标准格式完成：称呼、正文、结尾敬语、署名。注意英文字母书写规范。',
'cet4',
'{"salutation": "Dear Tom,", "body": "I am delighted to hear that you are interested in learning Chinese. Here are some suggestions that may help you on this exciting journey.\n\nFirstly, I would recommend enrolling in a reputable language school such as the Beijing Language and Culture University, which offers specialized courses for international students. Secondly, you might find it helpful to use online platforms such as Duolingo or HelloChinese to practice on a daily basis. Additionally, participating in local Chinese corners or language exchange programs can provide you with valuable opportunities to practice speaking with native speakers.\n\nI genuinely hope these suggestions will prove useful. Please feel free to reach out if you need any further assistance.", "closing": "Yours sincerely,\nLi Ming", "signature": "Li Ming"}',
1),

('format', '四级通知格式——校园活动',
'学生会将举办一场英语演讲比赛，请你以学生会的名义写一份标准格式的通知，告知全校学生比赛的时间、地点和报名方式。',
'请按照通知标准格式完成，注意标题、正文结构、落款。',
'cet4',
'{"salutation": "NOTICE", "body": "English Speech Contest\n\nTo: All Students\n\nDate: June 15, 2026\n\nThe Student Union is pleased to announce that an English Speech Contest will be held on June 25, 2026, in the University Auditorium. The contest aims to enhance students'' English speaking skills and build their confidence in public speaking.\n\nThe contest will be divided into two categories: prepared speech and impromptu speech. All students are welcome to participate. Those who are interested should register at the Student Union Office by June 20, 2026.\n\nFor further information, please contact us at studentunion@example.com.", "closing": "Student Union", "signature": "Student Union", "date": "June 10, 2026"}',
2),

('format', '四级书信格式——感谢信',
'你的老师Professor Wang在你申请研究生的过程中给予了很大的帮助，请你给他写一封感谢信。',
'请按照书信标准格式完成，注意感谢信的语气和格式规范。',
'cet4',
'{"salutation": "Dear Professor Wang,", "body": "I am writing to express my heartfelt gratitude for the invaluable guidance and support you have generously provided throughout my graduate school application process.\n\nYour insightful advice on my research proposal and your willingness to write a strong recommendation letter made a significant difference in my application. Without your patient mentorship and encouragement, I would not have been able to navigate this challenging process with such confidence.\n\nI am truly fortunate to have the opportunity to learn from you, and I will always cherish the knowledge and wisdom you have imparted.", "closing": "Yours sincerely,\nZhang Wei", "signature": "Zhang Wei"}',
3),

-- 六级格式
('format', '六级书信格式——倡议书',
'假设你是一名学生代表，请你以学生会名义写一封倡议书，呼吁全校同学践行绿色生活方式，减少校园浪费。',
'请按照倡议书的标准格式完成，注意倡议书的号召力和正式性。',
'cet6',
'{"salutation": "Dear Fellow Students,", "body": "As representatives of the Student Union, we are writing to call upon each and every one of you to embrace a greener lifestyle and contribute to reducing waste on campus.\n\nIt has come to our attention that the amount of disposable items being used and discarded on campus has reached an alarming level. Plastic bottles, disposable chopsticks, and food waste not only strain our environment but also contradict the values we uphold as educated citizens.\n\nWe hereby propose the following initiatives: First, bring your own reusable water bottles and shopping bags. Second, sort your waste properly according to recycling guidelines. Third, participate in our monthly ''''Green Campus Day'''' activities.\n\nLet us work together to make our campus a model of sustainability.", "closing": "Student Union\nCentral Campus", "signature": "Student Union", "date": "March 5, 2026"}',
4);
