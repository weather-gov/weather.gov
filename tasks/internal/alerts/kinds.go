package alerts

import "math"

// Hand-maintained from the hazard list at https://www.weather.gov/help-map

const (
	KindLand   = "land"
	KindMarine = "marine"
	KindOther  = "other"
)

var storedKinds = map[string]bool{
	KindLand: true,
}

const unmappedPriority = math.MaxInt

var (
	LevelWarning = Level{Priority: 0, Text: "warning"}
	LevelWatch   = Level{Priority: 128, Text: "watch"}
	LevelOther   = Level{Priority: 2048, Text: "other"}
)

// The fallback for an event with no mapping
var UnknownMetadata = Metadata{
	Level:    Level{Priority: unmappedPriority, Text: "other"},
	Kind:     KindLand,
	Priority: unmappedPriority,
}

// Keyed by the lowercased event name
var EventToMetadata = map[string]Metadata{
	"tsunami warning":                  {Level: LevelWarning, Kind: KindLand, Priority: 0},
	"tornado warning":                  {Level: LevelWarning, Kind: KindLand, Priority: 1024},
	"extreme wind warning":             {Level: LevelWarning, Kind: KindLand, Priority: 2048},
	"severe thunderstorm warning":      {Level: LevelWarning, Kind: KindLand, Priority: 3072},
	"flash flood warning":              {Level: LevelWarning, Kind: KindLand, Priority: 4096},
	"flash flood statement":            {Level: LevelOther, Kind: KindLand, Priority: 5120},
	"severe weather statement":         {Level: LevelOther, Kind: KindLand, Priority: 6144},
	"shelter in place warning":         {Level: LevelWarning, Kind: KindLand, Priority: 7168},
	"evacuation immediate":             {Level: LevelOther, Kind: KindLand, Priority: 8192},
	"civil danger warning":             {Level: LevelWarning, Kind: KindLand, Priority: 9216},
	"nuclear power plant warning":      {Level: LevelWarning, Kind: KindLand, Priority: 10240},
	"radiological hazard warning":      {Level: LevelWarning, Kind: KindLand, Priority: 11264},
	"hazardous materials warning":      {Level: LevelWarning, Kind: KindLand, Priority: 12288},
	"fire warning":                     {Level: LevelWarning, Kind: KindLand, Priority: 13312},
	"civil emergency message":          {Level: LevelOther, Kind: KindLand, Priority: 14336},
	"law enforcement warning":          {Level: LevelWarning, Kind: KindLand, Priority: 15360},
	"storm surge warning":              {Level: LevelWarning, Kind: KindMarine, Priority: 16384},
	"hurricane force wind warning":     {Level: LevelWarning, Kind: KindMarine, Priority: 17408},
	"hurricane warning":                {Level: LevelWarning, Kind: KindLand, Priority: 18432},
	"typhoon warning":                  {Level: LevelWarning, Kind: KindLand, Priority: 19456},
	"special marine warning":           {Level: LevelWarning, Kind: KindMarine, Priority: 20480},
	"blizzard warning":                 {Level: LevelWarning, Kind: KindLand, Priority: 21504},
	"snow squall warning":              {Level: LevelWarning, Kind: KindLand, Priority: 22528},
	"ice storm warning":                {Level: LevelWarning, Kind: KindLand, Priority: 23552},
	"heavy freezing spray warning":     {Level: LevelWarning, Kind: KindMarine, Priority: 24576},
	"winter storm warning":             {Level: LevelWarning, Kind: KindLand, Priority: 25600},
	"lake effect snow warning":         {Level: LevelWarning, Kind: KindLand, Priority: 26624},
	"dust storm warning":               {Level: LevelWarning, Kind: KindLand, Priority: 27648},
	"blowing dust warning":             {Level: LevelWarning, Kind: KindOther, Priority: 28672},
	"high wind warning":                {Level: LevelWarning, Kind: KindLand, Priority: 29696},
	"tropical storm warning":           {Level: LevelWarning, Kind: KindLand, Priority: 30720},
	"storm warning":                    {Level: LevelWarning, Kind: KindMarine, Priority: 31744},
	"tsunami advisory":                 {Level: LevelOther, Kind: KindLand, Priority: 32768},
	"tsunami watch":                    {Level: LevelWatch, Kind: KindLand, Priority: 33792},
	"avalanche warning":                {Level: LevelWarning, Kind: KindLand, Priority: 34816},
	"earthquake warning":               {Level: LevelWarning, Kind: KindLand, Priority: 35840},
	"volcano warning":                  {Level: LevelWarning, Kind: KindLand, Priority: 36864},
	"ashfall warning":                  {Level: LevelWarning, Kind: KindLand, Priority: 37888},
	"flood warning":                    {Level: LevelWarning, Kind: KindLand, Priority: 38912},
	"coastal flood warning":            {Level: LevelWarning, Kind: KindLand, Priority: 39936},
	"lakeshore flood warning":          {Level: LevelWarning, Kind: KindLand, Priority: 40960},
	"ashfall advisory":                 {Level: LevelOther, Kind: KindLand, Priority: 41984},
	"high surf warning":                {Level: LevelWarning, Kind: KindLand, Priority: 43008},
	"extreme heat warning":             {Level: LevelWarning, Kind: KindLand, Priority: 44032},
	"tornado watch":                    {Level: LevelWatch, Kind: KindLand, Priority: 45056},
	"severe thunderstorm watch":        {Level: LevelWatch, Kind: KindLand, Priority: 46080},
	"flash flood watch":                {Level: LevelWatch, Kind: KindLand, Priority: 47104},
	"gale warning":                     {Level: LevelWarning, Kind: KindMarine, Priority: 48128},
	"flood statement":                  {Level: LevelOther, Kind: KindLand, Priority: 49152},
	"extreme cold warning":             {Level: LevelWarning, Kind: KindLand, Priority: 50176},
	"freeze warning":                   {Level: LevelWarning, Kind: KindLand, Priority: 51200},
	"red flag warning":                 {Level: LevelWarning, Kind: KindLand, Priority: 52224},
	"storm surge watch":                {Level: LevelWatch, Kind: KindMarine, Priority: 53248},
	"hurricane watch":                  {Level: LevelWatch, Kind: KindLand, Priority: 54272},
	"hurricane force wind watch":       {Level: LevelWatch, Kind: KindMarine, Priority: 55296},
	"typhoon watch":                    {Level: LevelWatch, Kind: KindLand, Priority: 56320},
	"tropical storm watch":             {Level: LevelWatch, Kind: KindLand, Priority: 57344},
	"storm watch":                      {Level: LevelWatch, Kind: KindMarine, Priority: 58368},
	"tropical cyclone local statement": {Level: LevelOther, Kind: KindLand, Priority: 59392},
	"winter weather advisory":          {Level: LevelOther, Kind: KindLand, Priority: 60416},
	"avalanche advisory":               {Level: LevelOther, Kind: KindLand, Priority: 61440},
	"cold weather advisory":            {Level: LevelOther, Kind: KindLand, Priority: 62464},
	"heat advisory":                    {Level: LevelOther, Kind: KindLand, Priority: 63488},
	"flood advisory":                   {Level: LevelOther, Kind: KindLand, Priority: 64512},
	"coastal flood advisory":           {Level: LevelOther, Kind: KindLand, Priority: 65536},
	"lakeshore flood advisory":         {Level: LevelOther, Kind: KindLand, Priority: 66560},
	"high surf advisory":               {Level: LevelOther, Kind: KindLand, Priority: 67584},
	"dense fog advisory":               {Level: LevelOther, Kind: KindLand, Priority: 68608},
	"dense smoke advisory":             {Level: LevelOther, Kind: KindLand, Priority: 69632},
	"small craft advisory":             {Level: LevelOther, Kind: KindMarine, Priority: 70656},
	"brisk wind advisory":              {Level: LevelOther, Kind: KindMarine, Priority: 71680},
	"hazardous seas warning":           {Level: LevelWarning, Kind: KindMarine, Priority: 72704},
	"dust advisory":                    {Level: LevelOther, Kind: KindOther, Priority: 73728},
	"blowing dust advisory":            {Level: LevelOther, Kind: KindLand, Priority: 74752},
	"lake wind advisory":               {Level: LevelOther, Kind: KindLand, Priority: 75776},
	"wind advisory":                    {Level: LevelOther, Kind: KindLand, Priority: 76800},
	"frost advisory":                   {Level: LevelOther, Kind: KindLand, Priority: 77824},
	"freezing fog advisory":            {Level: LevelOther, Kind: KindLand, Priority: 78848},
	"freezing spray advisory":          {Level: LevelOther, Kind: KindMarine, Priority: 79872},
	"low water advisory":               {Level: LevelOther, Kind: KindMarine, Priority: 80896},
	"local area emergency":             {Level: LevelOther, Kind: KindLand, Priority: 81920},
	"winter storm watch":               {Level: LevelWatch, Kind: KindLand, Priority: 82944},
	"rip current statement":            {Level: LevelOther, Kind: KindLand, Priority: 83968},
	"beach hazards statement":          {Level: LevelOther, Kind: KindLand, Priority: 84992},
	"gale watch":                       {Level: LevelWatch, Kind: KindMarine, Priority: 86016},
	"avalanche watch":                  {Level: LevelWatch, Kind: KindLand, Priority: 87040},
	"hazardous seas watch":             {Level: LevelWatch, Kind: KindMarine, Priority: 88064},
	"heavy freezing spray watch":       {Level: LevelWatch, Kind: KindMarine, Priority: 89088},
	"flood watch":                      {Level: LevelWatch, Kind: KindLand, Priority: 90112},
	"coastal flood watch":              {Level: LevelWatch, Kind: KindLand, Priority: 91136},
	"lakeshore flood watch":            {Level: LevelWatch, Kind: KindLand, Priority: 92160},
	"high wind watch":                  {Level: LevelWatch, Kind: KindLand, Priority: 93184},
	"extreme heat watch":               {Level: LevelWatch, Kind: KindLand, Priority: 94208},
	"extreme cold watch":               {Level: LevelWatch, Kind: KindLand, Priority: 95232},
	"freeze watch":                     {Level: LevelWatch, Kind: KindLand, Priority: 96256},
	"fire weather watch":               {Level: LevelWatch, Kind: KindLand, Priority: 97280},
	"extreme fire danger":              {Level: LevelOther, Kind: KindLand, Priority: 98304},
	"911 telephone outage":             {Level: LevelOther, Kind: KindLand, Priority: 99328},
	"coastal flood statement":          {Level: LevelOther, Kind: KindLand, Priority: 100352},
	"lakeshore flood statement":        {Level: LevelOther, Kind: KindLand, Priority: 101376},
	"special weather statement":        {Level: LevelOther, Kind: KindLand, Priority: 102400},
	"marine weather statement":         {Level: LevelOther, Kind: KindMarine, Priority: 103424},
	"air quality alert":                {Level: LevelOther, Kind: KindLand, Priority: 104448},
	"air stagnation advisory":          {Level: LevelOther, Kind: KindLand, Priority: 105472},
	"hazardous weather outlook":        {Level: LevelOther, Kind: KindLand, Priority: 106496},
	"hydrologic outlook":               {Level: LevelOther, Kind: KindLand, Priority: 107520},
	"short term forecast":              {Level: LevelOther, Kind: KindLand, Priority: 108544},
	"administrative message":           {Level: LevelOther, Kind: KindLand, Priority: 109568},
	"test":                             {Level: LevelOther, Kind: KindLand, Priority: 110592},
	"child abduction emergency":        {Level: LevelOther, Kind: KindLand, Priority: 111616},
	"blue alert":                       {Level: LevelOther, Kind: KindOther, Priority: 112640},
}
