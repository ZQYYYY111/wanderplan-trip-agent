import assert from "node:assert/strict";
import test from "node:test";
import { routeTripRequest } from "../lib/trip-router.ts";

test("routes a new trip without spending a model call",()=>{
  const route=routeTripRequest("10月带父母去成都2天，预算4000元，少走路",null);
  assert.deepEqual(route,{intent:"new_trip",destination:"成都",days:2,startDate:null,travelers:3,budget:4000});
});

test("recognizes a conversational trip revision",()=>{
  const current={destination:"成都"};
  const route=routeTripRequest("第二天如果下雨，换成室内方案",current);
  assert.equal(route.intent,"revise_trip");
  assert.equal(route.destination,"成都");
});
