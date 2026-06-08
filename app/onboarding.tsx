import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: W, height: H } = Dimensions.get('window');

// Phone frame sizing — kept modest so all slide content fits on small screens
const PHONE_W = Math.min(W * 0.56, 220);
const PHONE_H = PHONE_W * 2.09;
const SCREEN_W = PHONE_W - 6;
const SCREEN_H = PHONE_H - 6;

// ── App screen mockups (accurate V1Portal UI) ─────────────────────────────────

function ScreenDashboard() {
  return (
    <View style={sc.root}>
      {/* Nav bar */}
      <View style={sc.nav}>
        <Ionicons name="menu" size={14} color="rgba(255,255,255,0.7)" />
        <Text style={sc.navTitle}>V/PORTAL</Text>
        <LinearGradient colors={['#833AB4','#E1306C']} style={sc.navAvatar} />
      </View>
      {/* V1 Score card */}
      <LinearGradient colors={['#1a0a2e','#12081a']} style={sc.scoreCard}>
        <Text style={sc.scoreLabel}>V1 SCORE</Text>
        <Text style={sc.scoreBig}>87</Text>
        <Text style={sc.scoreSub}>ELITE LEVEL</Text>
        <View style={sc.tierRow}>
          {['Dev','Emrg','Comp','Elite'].map((t,i)=>(
            <View key={i} style={[sc.tierPill, i===3 && sc.tierActive]}>
              <Text style={[sc.tierTxt, i===3 && {color:'#833AB4'}]}>{t}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>
      {/* Progress */}
      <View style={sc.section}>
        <View style={sc.progressHeader}>
          <Text style={sc.sectionLabel}>Overall Progress</Text>
          <Text style={sc.sectionSub}>1/6 phases</Text>
        </View>
        <View style={sc.progressBar}>
          <LinearGradient colors={['#833AB4','#E1306C']} style={{width:'17%',height:'100%',borderRadius:3}} />
        </View>
        <View style={sc.phaseRow}>
          {[1,2,3,4,5,6].map(n=>(
            <View key={n} style={[sc.phaseDot, n===1 && sc.phaseDotDone, n===2 && sc.phaseDotActive]}>
              <Text style={sc.phaseDotTxt}>{n}</Text>
            </View>
          ))}
        </View>
      </View>
      {/* Upgrade banner */}
      <LinearGradient colors={['#833AB4','#E1306C']} style={sc.upgradeBanner}>
        <Text style={sc.upgradeTitle}>LIMITED ACCESS</Text>
        <Text style={sc.upgradeHead}>Unlock Pro or Elite</Text>
        <Text style={sc.upgradeSub}>Get program matches, coach contacts, outreach tools & more</Text>
        <View style={sc.upgradeBtn}><Text style={sc.upgradeBtnTxt}>Upgrade →</Text></View>
      </LinearGradient>
      {/* Tab bar */}
      <View style={sc.tabBar}>
        {(['home','person','school','time','person-circle'] as const).map((ic,i)=>(
          <View key={i} style={sc.tabItem}>
            <Ionicons name={ic} size={13} color={i===0?'#833AB4':'rgba(255,255,255,0.3)'} />
          </View>
        ))}
      </View>
    </View>
  );
}

function ScreenProfile() {
  return (
    <View style={sc.root}>
      <View style={sc.nav}>
        <Ionicons name="chevron-back" size={14} color="rgba(255,255,255,0.7)" />
        <Text style={sc.navTitle}>My Profile</Text>
        <Ionicons name="create-outline" size={13} color="rgba(255,255,255,0.7)" />
      </View>
      {/* Profile header */}
      <View style={sc.profileHeader}>
        <LinearGradient colors={['#833AB4','#E1306C']} style={sc.profileAvatar}>
          <Text style={{fontSize:13,fontWeight:'900',color:'#fff'}}>KB</Text>
        </LinearGradient>
        <View style={{marginLeft:8}}>
          <Text style={{fontSize:11,fontWeight:'800',color:'#fff'}}>Kobee Bolton</Text>
          <Text style={{fontSize:8,color:'rgba(255,255,255,0.5)'}}>QB • 2026</Text>
        </View>
      </View>
      {/* Measurables */}
      <View style={sc.meaRow}>
        {[["6'2\"","Height"],['195 lbs','Weight'],['3.6','GPA'],['4.5','40 Yard']].map(([v,l],i)=>(
          <View key={i} style={sc.meaBox}>
            <Text style={{fontSize:8,fontWeight:'700',color:'#fff'}}>{v}</Text>
            <Text style={{fontSize:6,color:'rgba(255,255,255,0.4)'}}>{l}</Text>
          </View>
        ))}
      </View>
      {/* Info rows */}
      {['Position','HUDL Film','Highlights','Academics','Stats'].map((item,i)=>(
        <View key={i} style={sc.infoRow}>
          <View style={sc.infoIcon}><Ionicons name="chevron-forward" size={8} color="rgba(255,255,255,0.3)" /></View>
          <Text style={{flex:1,fontSize:8,color:'rgba(255,255,255,0.8)'}}>{item}</Text>
          <Ionicons name="chevron-forward" size={8} color="rgba(255,255,255,0.2)" />
        </View>
      ))}
      <View style={sc.tabBar}>
        {(['home','person','school','time','person-circle'] as const).map((ic,i)=>(
          <View key={i} style={sc.tabItem}>
            <Ionicons name={ic} size={13} color={i===1?'#833AB4':'rgba(255,255,255,0.3)'} />
          </View>
        ))}
      </View>
    </View>
  );
}

function ScreenPrograms() {
  return (
    <View style={sc.root}>
      <View style={sc.nav}>
        <Ionicons name="chevron-back" size={14} color="rgba(255,255,255,0.7)" />
        <Text style={sc.navTitle}>Program Matches</Text>
        <View style={{width:14}} />
      </View>
      {/* Filter pills */}
      <View style={sc.filterRow}>
        {['All Matches','Strong','Good','Reach'].map((f,i)=>(
          <View key={i} style={[sc.filterPill, i===0 && sc.filterActive]}>
            <Text style={[sc.filterTxt, i===0 && {color:'#fff'}]}>{f}</Text>
          </View>
        ))}
      </View>
      {/* Program rows */}
      {[
        {name:'Bethel University', loc:'McKenzie, Tennessee', tag:'Strong Match', div:'NAIA', c:'#10b981'},
        {name:'Faulkner University', loc:'Montgomery, Alabama', tag:'Good Match', div:'NAIA', c:'#3ab7ed'},
        {name:'Reinhardt University', loc:'Waleska, Georgia', tag:'Reach', div:'NAIA', c:'#f1a10d'},
        {name:'Alderson Broaddus', loc:'Philippi, West Virginia', tag:'Reach', div:'NCAA DII', c:'#f1a10d'},
        {name:'Point University', loc:'West Point, Georgia', tag:'Good Match', div:'NAIA', c:'#3ab7ed'},
      ].map((p,i)=>(
        <View key={i} style={sc.programRow}>
          <View style={sc.programLogo}>
            <Text style={{fontSize:7,fontWeight:'900',color:'#833AB4'}}>{p.name[0]}</Text>
          </View>
          <View style={{flex:1,marginLeft:6}}>
            <Text style={{fontSize:8,fontWeight:'700',color:'#fff'}}>{p.name}</Text>
            <Text style={{fontSize:6.5,color:'rgba(255,255,255,0.4)'}}>{p.loc}</Text>
            <View style={{flexDirection:'row',gap:3,marginTop:2}}>
              <View style={{backgroundColor:p.c+'22',borderRadius:3,paddingHorizontal:4,paddingVertical:1}}>
                <Text style={{fontSize:6,fontWeight:'700',color:p.c}}>{p.tag}</Text>
              </View>
              <View style={{backgroundColor:'rgba(255,255,255,0.07)',borderRadius:3,paddingHorizontal:4,paddingVertical:1}}>
                <Text style={{fontSize:6,color:'rgba(255,255,255,0.5)'}}>{p.div}</Text>
              </View>
            </View>
          </View>
          <Ionicons name="star-outline" size={10} color="rgba(255,255,255,0.2)" />
        </View>
      ))}
      <View style={sc.tabBar}>
        {(['home','person','school','time','person-circle'] as const).map((ic,i)=>(
          <View key={i} style={sc.tabItem}>
            <Ionicons name={ic} size={13} color={i===2?'#833AB4':'rgba(255,255,255,0.3)'} />
          </View>
        ))}
      </View>
    </View>
  );
}

function ScreenOutreach() {
  return (
    <View style={sc.root}>
      <View style={sc.nav}>
        <Ionicons name="chevron-back" size={14} color="rgba(255,255,255,0.7)" />
        <Text style={sc.navTitle}>New Message</Text>
        <View style={{width:14}} />
      </View>
      {/* Coach card */}
      <View style={sc.coachCard}>
        <LinearGradient colors={['#1a0a2e','#2d1b4e']} style={sc.coachAvatar}>
          <Text style={{fontSize:10,fontWeight:'900',color:'#833AB4'}}>D</Text>
        </LinearGradient>
        <View style={{marginLeft:8}}>
          <Text style={{fontSize:9,fontWeight:'800',color:'#fff'}}>Coach Davis</Text>
          <Text style={{fontSize:7,color:'rgba(255,255,255,0.45)'}}>Offensive Coordinator</Text>
          <Text style={{fontSize:7,color:'rgba(255,255,255,0.45)'}}>Bethel University</Text>
        </View>
      </View>
      {/* Subject */}
      <View style={sc.msgField}>
        <Text style={sc.msgFieldLabel}>Subject <Text style={{color:'rgba(255,255,255,0.3)'}}>48/60</Text></Text>
        <Text style={{fontSize:8,color:'rgba(255,255,255,0.7)'}}>2026 QB Prospect – Interested in Bethel University</Text>
      </View>
      {/* Message body */}
      <View style={[sc.msgField,{flex:1}]}>
        <Text style={sc.msgFieldLabel}>Message</Text>
        <Text style={{fontSize:7.5,color:'rgba(255,255,255,0.65)',lineHeight:11}}>
          Coach Davis,{'\n\n'}
          My name is Kobee Bolton, a 2026 Quarterback from Houston, TX. I'm very interested in Bethel University and the opportunity to compete and contribute to your program...{'\n\n'}
          Thank you for your time and consideration.
        </Text>
      </View>
      {/* Send button */}
      <LinearGradient colors={['#833AB4','#E1306C']} style={sc.sendBtn}>
        <Text style={{fontSize:10,fontWeight:'800',color:'#fff'}}>Send Message</Text>
      </LinearGradient>
    </View>
  );
}

function ScreenGameplan() {
  return (
    <View style={sc.root}>
      <View style={[sc.nav,{flexDirection:'column',alignItems:'flex-start',paddingBottom:8}]}>
        <Text style={{fontSize:8,fontWeight:'700',color:'rgba(255,255,255,0.4)',letterSpacing:1,textTransform:'uppercase'}}>THE GAMEPLAN</Text>
        <Text style={{fontSize:13,fontWeight:'900',color:'#fff',marginTop:2}}>Good evening, Kobee.</Text>
        <Text style={{fontSize:8,color:'rgba(255,255,255,0.5)'}}>You're on Phase 2 of 6. Keep the momentum going.</Text>
      </View>
      {/* Score card */}
      <LinearGradient colors={['#1a0a2e','#12081a']} style={[sc.scoreCard,{marginHorizontal:8,marginBottom:6}]}>
        <Text style={sc.scoreLabel}>V1 SCORE</Text>
        <Text style={sc.scoreBig}>87</Text>
        <Text style={sc.scoreSub}>NAIA / JUCO LEVEL</Text>
        <View style={sc.tierRow}>
          {['Dev','Emrg','Comp','Elite'].map((t,i)=>(
            <View key={i} style={[sc.tierPill, i===1 && sc.tierActive]}>
              <Text style={[sc.tierTxt, i===1 && {color:'#833AB4'}]}>{t}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>
      {/* Phase list */}
      {[
        {n:1,label:'Know Your Value',status:'COMPLETED',c:'#10b981'},
        {n:2,label:'Build Your Profile',status:'IN PROGRESS',c:'#3ab7ed'},
        {n:3,label:'Strategic Program Targeting',status:'PRO',c:'rgba(255,255,255,0.3)'},
      ].map((p,i)=>(
        <View key={i} style={sc.phaseItem}>
          <View style={[sc.phaseNum, {backgroundColor: p.c+'22', borderColor: p.c}]}>
            <Text style={{fontSize:7,fontWeight:'800',color:p.c}}>{p.n}</Text>
          </View>
          <View style={{flex:1,marginLeft:6}}>
            <Text style={{fontSize:8,fontWeight:'700',color:'#fff'}}>PHASE {p.n}</Text>
            <Text style={{fontSize:7,color:'rgba(255,255,255,0.5)'}}>{p.label}</Text>
          </View>
          <View style={{backgroundColor:p.c+'22',borderRadius:4,paddingHorizontal:5,paddingVertical:2}}>
            <Text style={{fontSize:6,fontWeight:'700',color:p.c}}>{p.status}</Text>
          </View>
        </View>
      ))}
      <View style={sc.tabBar}>
        {(['home','person','school','time','person-circle'] as const).map((ic,i)=>(
          <View key={i} style={sc.tabItem}>
            <Ionicons name={ic} size={13} color={i===3?'#833AB4':'rgba(255,255,255,0.3)'} />
          </View>
        ))}
      </View>
    </View>
  );
}

// Shared screen styles
const sc = StyleSheet.create({
  root: { flex:1, backgroundColor:'#08080f' },
  nav: {
    flexDirection:'row', alignItems:'center', justifyContent:'space-between',
    paddingHorizontal:12, paddingTop:18, paddingBottom:8,
    backgroundColor:'#0d0d1a',
  },
  navTitle: { fontSize:9, fontWeight:'900', color:'#fff', letterSpacing:0.5 },
  navAvatar: { width:22, height:22, borderRadius:11 },
  scoreCard: { marginHorizontal:8, marginVertical:6, borderRadius:10, padding:10 },
  scoreLabel: { fontSize:7, fontWeight:'700', color:'rgba(255,255,255,0.5)', letterSpacing:1 },
  scoreBig: { fontSize:28, fontWeight:'900', color:'#fff', lineHeight:32 },
  scoreSub: { fontSize:7, color:'rgba(255,255,255,0.5)', marginBottom:6 },
  tierRow: { flexDirection:'row', gap:3 },
  tierPill: { paddingHorizontal:5, paddingVertical:2, borderRadius:4, backgroundColor:'rgba(255,255,255,0.05)' },
  tierActive: { backgroundColor:'rgba(131,58,180,0.15)' },
  tierTxt: { fontSize:6, fontWeight:'700', color:'rgba(255,255,255,0.35)' },
  section: { paddingHorizontal:10, marginBottom:6 },
  progressHeader: { flexDirection:'row', justifyContent:'space-between', marginBottom:4 },
  sectionLabel: { fontSize:8, fontWeight:'700', color:'#fff' },
  sectionSub: { fontSize:7, color:'rgba(255,255,255,0.4)' },
  progressBar: { height:5, backgroundColor:'rgba(255,255,255,0.06)', borderRadius:3, marginBottom:6, overflow:'hidden' },
  phaseRow: { flexDirection:'row', gap:4 },
  phaseDot: { width:14, height:14, borderRadius:7, backgroundColor:'rgba(255,255,255,0.08)', alignItems:'center', justifyContent:'center' },
  phaseDotDone: { backgroundColor:'#10b981' },
  phaseDotActive: { backgroundColor:'rgba(131,58,180,0.4)', borderWidth:1, borderColor:'#833AB4' },
  phaseDotTxt: { fontSize:6, fontWeight:'800', color:'rgba(255,255,255,0.7)' },
  upgradeBanner: { marginHorizontal:8, borderRadius:10, padding:10 },
  upgradeTitle: { fontSize:6, fontWeight:'700', color:'rgba(255,255,255,0.7)', letterSpacing:1, marginBottom:2 },
  upgradeHead: { fontSize:10, fontWeight:'900', color:'#fff', marginBottom:2 },
  upgradeSub: { fontSize:7, color:'rgba(255,255,255,0.75)', lineHeight:10, marginBottom:8 },
  upgradeBtn: { backgroundColor:'rgba(255,255,255,0.2)', borderRadius:20, paddingHorizontal:12, paddingVertical:5, alignSelf:'flex-start' },
  upgradeBtnTxt: { fontSize:8, fontWeight:'800', color:'#fff' },
  tabBar: {
    position:'absolute', bottom:0, left:0, right:0,
    flexDirection:'row', backgroundColor:'rgba(10,10,18,0.97)',
    borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.06)',
    paddingTop:7, paddingBottom:10,
  },
  tabItem: { flex:1, alignItems:'center', justifyContent:'center' },
  profileHeader: { flexDirection:'row', alignItems:'center', padding:10, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.06)' },
  profileAvatar: { width:34, height:34, borderRadius:17, alignItems:'center', justifyContent:'center' },
  meaRow: { flexDirection:'row', paddingHorizontal:8, gap:4, paddingVertical:8 },
  meaBox: { flex:1, backgroundColor:'rgba(255,255,255,0.04)', borderRadius:6, padding:5, alignItems:'center' },
  infoRow: { flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingVertical:7, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.04)', gap:8 },
  infoIcon: { width:18, height:18, borderRadius:5, backgroundColor:'rgba(131,58,180,0.2)', alignItems:'center', justifyContent:'center' },
  filterRow: { flexDirection:'row', paddingHorizontal:8, gap:5, paddingVertical:8 },
  filterPill: { paddingHorizontal:7, paddingVertical:4, borderRadius:20, backgroundColor:'rgba(255,255,255,0.05)' },
  filterActive: { backgroundColor:'#833AB4' },
  filterTxt: { fontSize:7, fontWeight:'600', color:'rgba(255,255,255,0.5)' },
  programRow: { flexDirection:'row', alignItems:'center', paddingHorizontal:10, paddingVertical:7, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.04)' },
  programLogo: { width:22, height:22, borderRadius:5, backgroundColor:'rgba(131,58,180,0.15)', alignItems:'center', justifyContent:'center' },
  coachCard: { flexDirection:'row', alignItems:'center', padding:10, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.06)' },
  coachAvatar: { width:30, height:30, borderRadius:7, alignItems:'center', justifyContent:'center' },
  msgField: { paddingHorizontal:10, paddingVertical:8, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.06)' },
  msgFieldLabel: { fontSize:7, fontWeight:'700', color:'rgba(255,255,255,0.4)', marginBottom:3 },
  sendBtn: { margin:10, borderRadius:25, paddingVertical:10, alignItems:'center' },
  phaseItem: { flexDirection:'row', alignItems:'center', paddingHorizontal:10, paddingVertical:7, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.04)' },
  phaseNum: { width:18, height:18, borderRadius:9, alignItems:'center', justifyContent:'center', borderWidth:1 },
});

// ── iPhone frame ──────────────────────────────────────────────────────────────

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <View style={fr.outer}>
      {/* Side buttons */}
      <View style={[fr.btn, fr.volUp]} />
      <View style={[fr.btn, fr.volDn]} />
      <View style={[fr.btn, fr.power]} />
      {/* Frame */}
      <View style={fr.frame}>
        {/* Dynamic island */}
        <View style={fr.island} />
        {/* Screen */}
        <View style={fr.screen}>{children}</View>
        {/* Home bar */}
        <View style={fr.homeBar} />
      </View>
    </View>
  );
}

const fr = StyleSheet.create({
  outer: {
    width: PHONE_W,
    height: PHONE_H,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.7,
    shadowRadius: 30,
    elevation: 30,
  },
  frame: {
    width: PHONE_W,
    height: PHONE_H,
    borderRadius: 32,
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    borderColor: '#2a2a2a',
    overflow: 'hidden',
    alignItems: 'center',
  },
  island: {
    position: 'absolute',
    top: 8,
    width: PHONE_W * 0.26,
    height: 9,
    backgroundColor: '#000',
    borderRadius: 5,
    zIndex: 10,
  },
  screen: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    paddingTop: 20,
    backgroundColor: '#08080f',
    overflow: 'hidden',
  },
  homeBar: {
    position: 'absolute',
    bottom: 5,
    width: PHONE_W * 0.28,
    height: 2.5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  btn: { position: 'absolute', backgroundColor: '#222', borderRadius: 2 },
  volUp:  { left: -2.5, top: PHONE_H * 0.2,  width: 2.5, height: PHONE_H * 0.065 },
  volDn:  { left: -2.5, top: PHONE_H * 0.29, width: 2.5, height: PHONE_H * 0.065 },
  power:  { right: -2.5, top: PHONE_H * 0.26, width: 2.5, height: PHONE_H * 0.1 },
});

// ── Slide data ────────────────────────────────────────────────────────────────

const SLIDES = [
  {
    id: '1',
    num: '01',
    Screen: ScreenDashboard,
    icon: 'analytics-outline' as const,
    title: 'Stop Guessing\nYour Recruiting\nLevel',
    body: 'Get your V1 Score and see exactly where you fit in college football.',
    caption: 'Know your value before\ncontacting coaches.',
  },
  {
    id: '2',
    num: '02',
    Screen: ScreenProfile,
    icon: 'person-outline' as const,
    title: 'Create A Profile\nCoaches Can\nEvaluate',
    body: 'Upload film, measurables, academics, and stats in one place.',
    caption: 'Everything coaches\nneed at a glance.',
  },
  {
    id: '3',
    num: '03',
    Screen: ScreenPrograms,
    icon: 'school-outline' as const,
    title: 'Discover Schools\nThat Match Your\nLevel',
    body: 'No more guessing which programs are realistic.',
    caption: 'Focus on opportunities\nthat fit your profile.',
  },
  {
    id: '4',
    num: '04',
    Screen: ScreenOutreach,
    icon: 'paper-plane-outline' as const,
    title: 'Reach Coaches\nWith Proven\nTemplates',
    body: 'Send personalized outreach without starting from scratch.',
    caption: 'Start conversations\nthat get responses.',
  },
  {
    id: '5',
    num: '05',
    Screen: ScreenGameplan,
    icon: 'map-outline' as const,
    title: 'Your Recruiting\nRoadmap',
    body: 'Complete each phase and move closer to your next offer.',
    caption: 'One platform. One\npath forward.',
  },
  {
    id: '6',
    num: '06',
    Screen: null,
    icon: null,
    title: 'Ready To Build\nYour Future?',
    body: 'Thousands of athletes dream about playing at the next level. Start building the plan.',
    caption: '',
    cta: true,
  },
];

type Slide = {
  id: string;
  num: string;
  Screen: React.ComponentType | null;
  icon: React.ComponentProps<typeof Ionicons>['name'] | null;
  title: string;
  body: string;
  caption: string;
  cta?: boolean;
};

// ── Slide component ───────────────────────────────────────────────────────────

function SlideItem({ item, onFinish, onLogin }: { item: Slide; onFinish: () => void; onLogin: () => void }) {
  if (item.cta) {
    return (
      <View style={[s.slide, s.ctaSlide, { width: W }]}>
        <Text style={s.num}>{item.num}</Text>
        <Image
          source={require('../assets/logo-mark.png')}
          style={s.ctaLogo}
          resizeMode="contain"
        />
        <View style={s.textBlock}>
          <Text style={[s.title, s.ctaTitle]}>{item.title}</Text>
          <Text style={s.body}>{item.body}</Text>
        </View>
        <Pressable onPress={onFinish}>
          <LinearGradient
            colors={['#E1306C', '#833AB4']}
            style={s.ctaBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={s.ctaBtnText}>Get My V1 Score</Text>
          </LinearGradient>
        </Pressable>
        <Pressable onPress={onLogin} style={s.signInBtn}>
          <Text style={s.signInText}>Already have an account? <Text style={s.signInLink}>Sign In</Text></Text>
        </Pressable>
      </View>
    );
  }

  const { Screen } = item;
  return (
    <View style={[s.slide, { width: W }]}>
      {/* Slide number */}
      <Text style={s.num}>{item.num}</Text>

      {/* Title + body */}
      <View style={s.textBlock}>
        <Text style={s.title}>{item.title}</Text>
        <Text style={s.body}>{item.body}</Text>
      </View>

      {/* Phone frame */}
      <PhoneFrame>
        {Screen ? <Screen /> : null}
      </PhoneFrame>

      {/* Icon + caption */}
      <View style={s.captionWrap}>
        <View style={s.iconCircle}>
          <Ionicons name={item.icon ?? 'star-outline'} size={18} color="#833AB4" />
        </View>
        <Text style={s.caption}>{item.caption}</Text>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router  = useRouter();
  const flatRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  const finish = async () => {
    await AsyncStorage.setItem('v1portal_onboarding_seen', '1');
    router.replace('/(tabs)');
  };

  const goLogin = async () => {
    await AsyncStorage.setItem('v1portal_onboarding_seen', '1');
    router.replace('/(auth)/login');
  };

  const goNext = () => {
    if (isLast) { finish(); return; }
    const next = index + 1;
    flatRef.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
  };

  return (
    <View style={s.root}>
      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        scrollEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
        onMomentumScrollEnd={e => {
          setIndex(Math.round(e.nativeEvent.contentOffset.x / W));
        }}
        renderItem={({ item }) => <SlideItem item={item} onFinish={finish} onLogin={goLogin} />}
        style={{ flex: 1 }}
      />

      {/* Bottom bar: dots + nav (hidden on CTA slide which has its own buttons) */}
      {!isLast && (
        <View style={s.bottomBar}>
          <View style={s.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[s.dot, i === index ? s.dotActive : s.dotInactive]}
              />
            ))}
          </View>

          <View style={s.btnRow}>
            <Pressable onPress={finish} style={s.skipBtn}>
              <Text style={s.skipTxt}>Skip</Text>
            </Pressable>

            <Pressable onPress={goNext}>
              <LinearGradient
                colors={['#833AB4', '#E1306C']}
                style={s.nextBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={s.nextTxt}>Next</Text>
                <Ionicons name="arrow-forward" size={15} color="#fff" />
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050507' },

  slide: {
    flex: 1,
    paddingTop: H * 0.055,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 14,
  },
  num: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '700',
    color: '#833AB4',
    letterSpacing: 1,
  },
  textBlock: { alignSelf: 'stretch', gap: 6 },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.5)',
  },

  captionWrap: { alignItems: 'center', gap: 6 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(131,58,180,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(131,58,180,0.3)',
  },
  caption: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 17,
  },

  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 44,
    paddingTop: 12,
    gap: 12,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { height: 3, borderRadius: 2 },
  dotActive: { width: 20, backgroundColor: '#833AB4' },
  dotInactive: { width: 5, backgroundColor: 'rgba(255,255,255,0.2)' },

  btnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skipBtn: { paddingVertical: 10, paddingRight: 16 },
  skipTxt: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.38)' },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 26, paddingVertical: 14, borderRadius: 100,
  },
  nextTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // CTA slide (slide 6)
  ctaSlide: {
    justifyContent: 'center',
    gap: 20,
  },
  ctaLogo: {
    width: 100,
    height: 100,
    alignSelf: 'center',
  },
  ctaTitle: {
    textAlign: 'center',
    fontSize: 30,
  },
  ctaBtn: {
    borderRadius: 100,
    paddingVertical: 17,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  ctaBtnText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.2,
  },
  signInBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  signInText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  signInLink: {
    color: '#fff',
    fontWeight: '700',
  },
});
