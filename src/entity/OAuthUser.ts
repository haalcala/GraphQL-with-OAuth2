import { Entity, ObjectIdColumn, ObjectID, Column, BaseEntity } from "typeorm";
import { ObjectType, Field, ID } from "type-graphql";

@ObjectType()
@Entity("OAuthUsers")
export class OAuthUser extends BaseEntity {
	@Field(() => ID)
	@ObjectIdColumn()
	id: ObjectID;

	@Field()
	@Column("text", { unique: true })
	userId: string;

	@Field()
	@Column("text")
	email: string;

	@Field()
	@Column("text")
	createdAt: Date;

	@Field()
	@Column("text")
	updatedAt: Date;

	@Column("text", { nullable: true })
	password: string;

	@Column("text", { nullable: true })
	salt: string;

	@Field(() => [String], { nullable: true })
	@Column("text")
	scope: string[]; // user, admin
}
